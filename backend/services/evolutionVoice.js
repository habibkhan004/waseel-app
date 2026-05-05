const path = require("path")
const fs = require("fs")
const { spawnSync } = require("child_process")
const { pathToFileURL } = require("url")
const { PollyClient, SynthesizeSpeechCommand } = require("@aws-sdk/client-polly")
const { whisperLanguageToReplyLang } = require("./langDetect")
const { transcribeWithNodeWhisper, canRunNodeStt } = require("./nodeWhisperStt")
const { transcribeWithFasterWhisper, canRunFasterWhisperStt } = require("./fasterWhisperStt")

/**
 * Voice pipeline for Evolution auto-reply.
 *
 * STT providers: faster-whisper | node | ollama | openai | groq | auto
 * TTS providers: aws | edge | elevenlabs | openai | ollama | none
 *
 * Gulf Arabic voices (edge-tts — best free option):
 *   EDGE_TTS_VOICE_AR=ar-SA-ZariyahNeural   (Saudi female — default, most natural)
 *   EDGE_TTS_VOICE_AR=ar-SA-HamedNeural     (Saudi male)
 *   EDGE_TTS_VOICE_AR=ar-AE-FatimaNeural    (Emirati female)
 *   EDGE_TTS_VOICE_AR=ar-AE-HamdanNeural    (Emirati male)
 *   EDGE_TTS_VOICE_AR=ar-KW-NouraNeural     (Kuwaiti female)
 *   EDGE_TTS_VOICE_AR=ar-KW-FahedNeural     (Kuwaiti male)
 *   EDGE_TTS_VOICE_AR=ar-QA-AmalNeural      (Qatari female)
 *   EDGE_TTS_VOICE_AR=ar-QA-MoazNeural      (Qatari male)
 *   EDGE_TTS_VOICE_AR=ar-BH-LailaNeural     (Bahraini female)
 *   EDGE_TTS_VOICE_AR=ar-BH-AliNeural       (Bahraini male)
 *   EDGE_TTS_VOICE_AR=ar-OM-AbdullahNeural  (Omani male)
 *
 * English voices (edge-tts):
 *   EDGE_TTS_VOICE_EN=en-US-AndrewNeural    (casual male — default)
 *   EDGE_TTS_VOICE_EN=en-US-EmmaNeural      (natural female)
 *   EDGE_TTS_VOICE_EN=en-US-BrianNeural     (warm male)
 *   EDGE_TTS_VOICE_EN=en-US-JennyNeural     (friendly female)
 *
 * AWS Polly Arabic (MSA only — less natural for Gulf):
 *   AWS_TTS_VOICE_AR=Hala   (neural, better than Zeina)
 *   AWS_TTS_VOICE_AR=Zayd   (neural male)
 *   AWS_TTS_VOICE_AR=Zeina  (standard, most robotic — avoid)
 */

const OPENAI_API_KEY   = String(process.env.OPENAI_API_KEY   || "").trim()
const GROQ_API_KEY     = String(process.env.GROQ_API_KEY     || "").trim()
const ELEVENLABS_API_KEY = String(process.env.ELEVENLABS_API_KEY || "").trim()

// ─────────────────────────────────────────────────────────────────────────────
// EVOLUTION HTTP HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function evolutionMediaTimeoutMs() {
  return Math.min(Math.max(Number(process.env.EVOLUTION_MEDIA_TIMEOUT_MS) || 120000, 10000), 600000)
}

function evolutionMediaHttpRetries() {
  return Math.min(Math.max(Number(process.env.EVOLUTION_MEDIA_HTTP_RETRIES) || 3, 1), 8)
}

function evolutionMediaRetryDelayMs() {
  return Math.min(Math.max(Number(process.env.EVOLUTION_MEDIA_RETRY_DELAY_MS) || 1000, 200), 30000)
}

function evolutionErrorLooksTransient(err) {
  const status = err?.response?.status
  if (status === 408 || status === 429) return true
  if (status >= 500 && status < 600) return true
  if (err?.response) return false
  const code = String(err?.code || "")
  if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ECONNABORTED" || code === "EPIPE") return true
  const msg = String(err?.message || "").toLowerCase()
  if (msg.includes("socket hang up")) return true
  if (msg.includes("network error")) return true
  return false
}

async function evolutionPostMediaWithRetry(client, urlPath, body) {
  const attempts  = evolutionMediaHttpRetries()
  const timeout   = evolutionMediaTimeoutMs()
  const baseDelay = evolutionMediaRetryDelayMs()
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      return await client.post(urlPath, body, { timeout })
    } catch (err) {
      lastErr = err
      const retry = i < attempts - 1 && evolutionErrorLooksTransient(err)
      if (retry) {
        await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, i)))
        continue
      }
      throw err
    }
  }
  throw lastErr
}

async function evolutionGetMediaWithRetry(client, urlPath) {
  const attempts  = evolutionMediaHttpRetries()
  const timeout   = evolutionMediaTimeoutMs()
  const baseDelay = evolutionMediaRetryDelayMs()
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      return await client.get(urlPath, { timeout })
    } catch (err) {
      lastErr = err
      const retry = i < attempts - 1 && evolutionErrorLooksTransient(err)
      if (retry) {
        await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, i)))
        continue
      }
      throw err
    }
  }
  throw lastErr
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO FORMAT HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function wavBase64ToMp3Base64Sync(strippedBase64) {
  let buf
  try {
    buf = Buffer.from(String(strippedBase64 || "").replace(/\s/g, ""), "base64")
  } catch {
    return strippedBase64
  }
  if (buf.length < 12) return strippedBase64
  const isWav =
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WAVE"
  if (!isWav) return strippedBase64

  let ffmpegBin
  try {
    ffmpegBin = require("ffmpeg-static")
  } catch {
    return strippedBase64
  }
  if (!ffmpegBin || !fs.existsSync(ffmpegBin)) return strippedBase64

  const os = require("os")
  const id     = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const tmpIn  = path.join(os.tmpdir(), `waseel-voice-${id}.wav`)
  const tmpOut = path.join(os.tmpdir(), `waseel-voice-${id}.mp3`)
  try {
    fs.writeFileSync(tmpIn, buf)
    const r = spawnSync(
      ffmpegBin,
      ["-nostdin", "-y", "-i", tmpIn, "-codec:a", "libmp3lame", "-q:a", "4", tmpOut],
      { encoding: "utf8", timeout: 120000, windowsHide: true }
    )
    if (r.status !== 0 || !fs.existsSync(tmpOut)) {
      console.warn("Evolution voice: WAV→MP3 ffmpeg failed", String(r.stderr || r.stdout || "").slice(0, 240))
      return strippedBase64
    }
    return fs.readFileSync(tmpOut).toString("base64")
  } finally {
    try { fs.unlinkSync(tmpIn)  } catch (_) {}
    try { fs.unlinkSync(tmpOut) } catch (_) {}
  }
}

function audioMp3Base64ForEvolutionSend(rawBase64) {
  const stripped = stripDataUrlBase64(rawBase64)
  return wavBase64ToMp3Base64Sync(stripped)
}

function whatsAppAudioEncodingDefaultOn() {
  return String(process.env.EVOLUTION_WHATSAPP_AUDIO_ENCODING || "true").trim().toLowerCase() !== "false"
}

function stripDataUrlBase64(s) {
  const str = String(s || "").trim()
  if (!str) return ""
  const m = str.match(/^data:[^;]+;base64,(.+)$/i)
  return (m ? m[1] : str).replace(/\s/g, "")
}

function extensionForMime(mime) {
  const m = String(mime || "").split(";")[0].trim().toLowerCase()
  if (m.includes("ogg"))                return "ogg"
  if (m.includes("opus"))               return "ogg"
  if (m.includes("mpeg") || m === "audio/mp3") return "mp3"
  if (m.includes("mp4") || m.includes("m4a")) return "m4a"
  if (m.includes("webm"))               return "webm"
  if (m.includes("wav"))                return "wav"
  return "ogg"
}

function containsArabicScript(text) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(String(text || ""))
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER FLAGS
// ─────────────────────────────────────────────────────────────────────────────

function normalizeOllamaBase() {
  return String(process.env.OLLAMA_URL || "http://127.0.0.1:11434").trim().replace(/\/$/, "") || "http://127.0.0.1:11434"
}

function ollamaAuthHeadersJson() {
  const k = String(process.env.OLLAMA_API_KEY || "").trim()
  return k ? { Authorization: `Bearer ${k}` } : {}
}

function isVoiceReplyEnabled() {
  return String(process.env.EVOLUTION_VOICE_REPLY || "").trim().toLowerCase() === "true"
}

function sendTextWithVoiceAlso() {
  return String(process.env.EVOLUTION_VOICE_REPLY_SEND_TEXT_ALSO || "").trim().toLowerCase() === "true"
}

function pickSttProvider() {
  const raw = String(process.env.VOICE_STT_PROVIDER || "auto").trim().toLowerCase().replace(/_/g, "-")
  if (raw === "faster-whisper" || raw === "fasterwhisper") return "faster-whisper"
  if (raw === "node")   return "node"
  if (raw === "ollama") return "ollama"
  if (raw === "groq"   && GROQ_API_KEY)   return "groq"
  if (raw === "openai" && OPENAI_API_KEY) return "openai"
  // auto chain
  if (GROQ_API_KEY)              return "groq"
  if (OPENAI_API_KEY)            return "openai"
  if (canRunFasterWhisperStt())  return "faster-whisper"
  if (canRunNodeStt())           return "node"
  return "ollama"
}

function pickTtsProvider() {
  const raw = String(process.env.VOICE_TTS_PROVIDER || "edge").trim().toLowerCase()
  if (["aws", "openai", "edge", "ollama", "none", "elevenlabs"].includes(raw)) return raw
  return "edge"   // default to edge (best Gulf Arabic voices, free)
}

function canTranscribe() {
  const p = pickSttProvider()
  if (p === "faster-whisper") return canRunFasterWhisperStt()
  if (p === "node")   return canRunNodeStt()
  if (p === "ollama") return true
  if (p === "groq")   return !!GROQ_API_KEY
  if (p === "openai") return !!OPENAI_API_KEY
  return false
}

function canSynthesize() {
  const p = pickTtsProvider()
  if (p === "none")       return false
  if (p === "aws")        return true
  if (p === "openai")     return !!OPENAI_API_KEY
  if (p === "elevenlabs") return !!ELEVENLABS_API_KEY
  if (p === "edge")       return true
  if (p === "ollama")     return true
  return false
}

function parseVoiceTtsFallbackSteps() {
  const raw = String(process.env.VOICE_TTS_FALLBACK || "aws,ollama").toLowerCase().trim()
  if (raw === "none" || raw === "off" || raw === "false") return []
  return raw.split(/[,;\s]+/).map((s) => s.trim()).filter((s) =>
    ["openai", "ollama", "edge", "aws"].includes(s)
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VOICE SELECTION — Gulf dialect first
// ─────────────────────────────────────────────────────────────────────────────

function pickEdgeVoice(replyLanguage) {
  // Arabic — default to Saudi female (most natural Gulf sound)
  const ar = String(
    process.env.EDGE_TTS_VOICE_AR || "ar-SA-ZariyahNeural"
  ).trim()

  // English — default to casual male (Andrew sounds most natural/informal)
  const en = String(
    process.env.EDGE_TTS_VOICE_EN || "en-US-AndrewNeural"
  ).trim()

  if (replyLanguage === "ar") return ar
  return en
}

function pickAwsPollyVoice(replyLanguage) {
  // Hala is neural and slightly more natural than Zeina for Arabic
  const ar = String(process.env.AWS_TTS_VOICE_AR || "Hala").trim()
  const en = String(process.env.AWS_TTS_VOICE_EN || "Matthew").trim()
  return replyLanguage === "ar" ? ar : en
}

function pickElevenLabsVoiceId(replyLanguage) {
  const ar = String(process.env.ELEVENLABS_VOICE_ID_AR || process.env.ELEVENLABS_VOICE_ID || "").trim()
  const en = String(process.env.ELEVENLABS_VOICE_ID_EN || process.env.ELEVENLABS_VOICE_ID || "").trim()
  return replyLanguage === "ar" ? ar || en : en || ar
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDIA PARSING
// ─────────────────────────────────────────────────────────────────────────────

function parseEvolutionMediaPayload(data) {
  if (!data || typeof data !== "object") return null
  const base64 = data.base64 ?? data.data?.base64 ?? data.media?.base64
  const clean   = stripDataUrlBase64(base64)
  if (!clean) return null
  try {
    const buffer = Buffer.from(clean, "base64")
    if (!buffer.length) return null
    const mimetype = String(data.mimetype || data.mimeType || "audio/ogg").split(";")[0].trim()
    return { buffer, mimetype }
  } catch {
    return null
  }
}

function unwrapMessageContent(message) {
  let msg = message || {}
  if (msg?.ephemeralMessage?.message)   msg = msg.ephemeralMessage.message
  if (msg?.viewOnceMessageV2?.message)  msg = msg.viewOnceMessageV2.message
  if (msg?.viewOnceMessage?.message)    msg = msg.viewOnceMessage.message
  return msg
}

function getAudioLikePayload(messageRoot) {
  const msg = unwrapMessageContent(messageRoot)
  return msg?.audioMessage || msg?.pttMessage || msg?.voiceMessage || null
}

function mediaKeyLooksPresent(audio) {
  if (!audio || typeof audio !== "object") return false
  const mk = audio.mediaKey
  if (mk == null) return false
  if (typeof mk === "string")    return mk.trim().length > 0
  if (Buffer.isBuffer(mk))       return mk.length > 0
  if (mk.type === "Buffer" && Array.isArray(mk.data)) return mk.data.length > 0
  if (Array.isArray(mk))         return mk.length > 0
  return true
}

function messageRowHasDecryptableAudio(m) {
  const a = getAudioLikePayload(m?.message)
  return Boolean(a && mediaKeyLooksPresent(a))
}

function normalizeFindMessagesRecords(data) {
  if (!data) return []
  if (Array.isArray(data))                      return data.filter(Boolean)
  if (Array.isArray(data.messages?.records))    return data.messages.records.filter(Boolean)
  if (Array.isArray(data.messages))             return data.messages.filter(Boolean)
  if (Array.isArray(data.records))              return data.records.filter(Boolean)
  if (Array.isArray(data.data))                 return data.data.filter(Boolean)
  return []
}

async function evolutionFetchMessageRowWithMediaKey(evolutionClient, instanceName, m) {
  const name      = String(instanceName || "").trim()
  const remoteJid = String(m?.key?.remoteJid || "").trim()
  const id        = String(m?.key?.id || "").trim()
  if (!name || !remoteJid || !id) return m
  if (messageRowHasDecryptableAudio(m)) return m

  const byId      = (row) => String(row?.key?.id || "").trim() === id
  const scanLimit = Math.min(Math.max(Number(process.env.EVOLUTION_VOICE_REFETCH_LIMIT) || 80, 10), 200)
  const findTimeout = Math.min(Math.max(Number(process.env.EVOLUTION_FIND_MESSAGES_TIMEOUT_MS) || 45000, 5000), 180000)

  const runFind = async (where, limit) => {
    const { data } = await evolutionClient.post(
      `/chat/findMessages/${encodeURIComponent(name)}`,
      { where, limit },
      { timeout: findTimeout }
    )
    return normalizeFindMessagesRecords(data)
  }

  try {
    let records = await runFind({ key: { remoteJid, id } }, 15)
    let withKey = records.find((row) => byId(row) && messageRowHasDecryptableAudio(row))
    if (withKey) {
      console.log("Evolution voice: refetched with mediaKey", { remoteJid, messageId: id })
      return withKey
    }

    records = await runFind({ key: { remoteJid } }, scanLimit)
    withKey = records.find((row) => byId(row) && messageRowHasDecryptableAudio(row))
    if (withKey) {
      console.log("Evolution voice: matched mediaKey after broad scan", { remoteJid, messageId: id, scanned: records.length })
      return withKey
    }

    const any = records.find(byId)
    if (any) return any
  } catch (err) {
    console.warn("Evolution voice: findMessages refetch failed", {
      remoteJid,
      messageId: id,
      status:    err?.response?.status,
      details:   err?.response?.data || err?.message,
    })
  }
  return m
}

async function evolutionMessageToAudio(evolutionClient, instanceName, message) {
  const name = String(instanceName || "").trim()
  if (!name || !message || typeof message !== "object") return null

  let payload = message
  if (!messageRowHasDecryptableAudio(message)) {
    payload = await evolutionFetchMessageRowWithMediaKey(evolutionClient, instanceName, message)
  }

  try {
    const { data } = await evolutionPostMediaWithRetry(
      evolutionClient,
      `/chat/getBase64FromMediaMessage/${encodeURIComponent(name)}`,
      { message: payload, convertToMp4: false }
    )
    return parseEvolutionMediaPayload(data)
  } catch (err) {
    const details = err?.response?.data || err?.message
    const msgStr  = JSON.stringify(details || "").toLowerCase()
    const hints   = []
    if (msgStr.includes("empty media key") || msgStr.includes("media key")) {
      hints.push("Enable DATABASE_SAVE_DATA_NEW_MESSAGE on Evolution or use webhook transport.")
    }
    if (msgStr.includes("socket hang up") || evolutionErrorLooksTransient(err)) {
      hints.push("Transient Evolution HTTP failure. Raise EVOLUTION_MEDIA_TIMEOUT_MS.")
    }
    console.warn("Evolution voice: getBase64FromMediaMessage failed", {
      instanceName: name,
      status:       err?.response?.status,
      code:         err?.code,
      details,
      hint:         hints.length ? hints.join(" ") : undefined,
    })
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STT
// ─────────────────────────────────────────────────────────────────────────────

async function transcribeOpenAiCompatible(url, apiKey, model, buffer, mimetype) {
  if (!buffer?.length) return null
  const ext      = extensionForMime(mimetype)
  const filename = `voice.${ext}`
  const type     = mimetype || "application/octet-stream"
  const blob     = new Blob([new Uint8Array(buffer)], { type })
  const form     = new FormData()
  form.append("file", blob, filename)
  form.append("model", model)

  const headers = {}
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 120000)
  try {
    const res = await fetch(url, { method: "POST", headers, body: form, signal: controller.signal })
    const txt = await res.text().catch(() => "")
    if (!res.ok) {
      console.warn("Evolution voice: STT API error", { status: res.status, details: txt.slice(0, 400) })
      return null
    }
    let json = {}
    try { json = JSON.parse(txt) } catch { return null }
    const text = String(json.text || "").trim()
    if (!text) return null
    const lang = json.language ? whisperLanguageToReplyLang(json.language) : null
    return { text, language: lang }
  } catch (err) {
    console.warn("Evolution voice: STT request failed", err?.message || err)
    return null
  } finally {
    clearTimeout(t)
  }
}

async function transcribeOllama(buffer, mimetype) {
  const base  = normalizeOllamaBase()
  const url   = `${base}/v1/audio/transcriptions`
  const model = String(process.env.OLLAMA_TRANSCRIBE_MODEL || process.env.OLLAMA_WHISPER_MODEL || "karanchopda333/whisper").trim()
  const apiKey = String(process.env.OLLAMA_API_KEY || "").trim()
  return transcribeOpenAiCompatible(url, apiKey, model, buffer, mimetype)
}

async function transcribeAudioBuffer(buffer, mimetype) {
  const provider = pickSttProvider()
  if (provider === "faster-whisper") return transcribeWithFasterWhisper(buffer, extensionForMime(mimetype))
  if (provider === "node")           return transcribeWithNodeWhisper(buffer, extensionForMime(mimetype))
  if (provider === "ollama")         return transcribeOllama(buffer, mimetype)
  if (provider === "groq") {
    return transcribeOpenAiCompatible(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      GROQ_API_KEY,
      String(process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo").trim(),
      buffer, mimetype
    )
  }
  if (provider === "openai") {
    return transcribeOpenAiCompatible(
      "https://api.openai.com/v1/audio/transcriptions",
      OPENAI_API_KEY,
      String(process.env.OPENAI_STT_MODEL || "whisper-1").trim(),
      buffer, mimetype
    )
  }
  return transcribeOllama(buffer, mimetype)
}

async function transcribeEvolutionVoiceNote(evolutionClient, instanceName, message) {
  if (!canTranscribe()) return null
  const remoteJid = String(message?.key?.remoteJid || "").trim()
  const messageId = String(message?.key?.id        || "").trim()
  const parsed    = await evolutionMessageToAudio(evolutionClient, instanceName, message)
  if (!parsed) {
    console.warn("Evolution voice: STT skipped — no decrypted audio from Evolution.", {
      instanceName,
      remoteJid:  remoteJid  || undefined,
      messageId:  messageId  || undefined,
    })
    return null
  }
  const out = await transcribeAudioBuffer(parsed.buffer, parsed.mimetype)
  if (!out?.text) {
    console.warn("Evolution voice: STT returned no text.", {
      instanceName,
      remoteJid: remoteJid || undefined,
      messageId: messageId || undefined,
    })
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// TTS — EDGE (primary, best Gulf Arabic voices, free)
// ─────────────────────────────────────────────────────────────────────────────

async function synthesizeEdgeTts(text, { replyLanguage } = {}) {
  const trimmed = String(text || "").trim()
  if (!trimmed) return null
  const voice = pickEdgeVoice(replyLanguage)

  try {
    // Try new edge-tts package API first
    const pkgDir   = path.dirname(require.resolve("edge-tts/package.json"))
    const edgeEntry = pathToFileURL(path.join(pkgDir, "out", "index.js")).href
    const edgeMod   = await import(edgeEntry)

    // Different edge-tts versions export differently
    const ttsFunc = edgeMod.tts || edgeMod.default?.tts || edgeMod.default
    if (typeof ttsFunc !== "function") throw new Error("edge-tts: no tts function found in package")

    const buf = await ttsFunc(trimmed.slice(0, 3000), { voice })
    if (!buf?.length) return null
    console.log(`[TTS] edge-tts voice=${voice} lang=${replyLanguage} chars=${trimmed.length}`)
    return Buffer.from(buf).toString("base64")
  } catch (err) {
    const msg = String(err?.message || err)
    console.warn(
      "Evolution voice: edge-tts failed —",
      msg.slice(0, 200),
      "\nHint: Microsoft sometimes blocks edge-tts (403). Fallback providers will be tried."
    )
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TTS — AWS POLLY (good English, MSA Arabic — not Khaleeji)
// ─────────────────────────────────────────────────────────────────────────────

const awsPollyClientsByRegion = new Map()

function getAwsPollyClient() {
  const region = String(process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1").trim()
  if (!awsPollyClientsByRegion.has(region)) {
    awsPollyClientsByRegion.set(region, new PollyClient({ region }))
  }
  return awsPollyClientsByRegion.get(region)
}

function awsPollyEngineOrder(preferred) {
  const p      = String(preferred || "neural").trim().toLowerCase()
  const tryGen = String(process.env.AWS_TTS_TRY_GENERATIVE || "").trim().toLowerCase() === "true"
  if (p === "generative" || tryGen) return ["generative", "neural", "standard"]
  if (p === "standard")             return ["standard"]
  return ["neural", "standard"]
}

function escapeXmlForSsml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function stripEmojiForTts(s) {
  if (String(process.env.AWS_TTS_STRIP_EMOJI || "true").trim().toLowerCase() === "false") return s
  return String(s || "").replace(/\p{Extended_Pictographic}/gu, " ").replace(/\s+/g, " ").trim()
}

function buildPollyTextPayload(rawText, engineName) {
  let text = String(rawText || "").trim().slice(0, 3000)
  text = stripEmojiForTts(text)
  if (!text) return { Text: "", TextType: "text" }

  const useSsml =
    String(process.env.AWS_TTS_SSML || "true").trim().toLowerCase() === "true" &&
    engineName !== "generative"

  if (!useSsml) return { Text: text, TextType: "text" }

  const rate    = String(process.env.AWS_TTS_PROSODY_RATE || "95%").trim()
  const escaped = escapeXmlForSsml(text.slice(0, 2800))
  return {
    Text:     `<speak><prosody rate="${rate}">${escaped}</prosody></speak>`,
    TextType: "ssml",
  }
}

async function synthesizeAwsTts(text, { replyLanguage } = {}) {
  const trimmed = String(text || "").trim()
  if (!trimmed) return null

  const voiceId   = pickAwsPollyVoice(replyLanguage)
  const enginePref = String(process.env.AWS_TTS_ENGINE || "neural").trim()
  const engines    = awsPollyEngineOrder(enginePref)

  async function audioStreamToBuffer(audioStream) {
    if (!audioStream) return Buffer.alloc(0)
    if (typeof audioStream.transformToByteArray === "function") {
      return Buffer.from(await audioStream.transformToByteArray())
    }
    if (Buffer.isBuffer(audioStream)) return audioStream
    if (typeof audioStream === "string") return Buffer.from(audioStream, "binary")
    if (typeof audioStream[Symbol.asyncIterator] === "function") {
      const chunks = []
      for await (const chunk of audioStream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      return Buffer.concat(chunks)
    }
    return Buffer.alloc(0)
  }

  try {
    const pollyClient = getAwsPollyClient()
    let lastErr = null

    for (const eng of engines) {
      try {
        const payload = buildPollyTextPayload(trimmed, eng)
        if (!payload.Text) return null
        const cmd = new SynthesizeSpeechCommand({
          ...payload,
          OutputFormat: "mp3",
          VoiceId:      voiceId,
          Engine:       eng,
        })
        const out   = await pollyClient.send(cmd)
        const bytes = await audioStreamToBuffer(out?.AudioStream)
        if (!bytes.length) continue

        if (eng !== engines[0]) {
          console.log(`Evolution voice: Polly engine=${eng} (fallback)`)
        }
        console.log(`[TTS] AWS Polly voice=${voiceId} engine=${eng} lang=${replyLanguage}`)
        return bytes.toString("base64")
      } catch (err) {
        lastErr = err
        const name = err?.name || ""
        const msg  = String(err?.message || err)
        const unsupported =
          name === "ValidationException" ||
          msg.includes("does not support") ||
          msg.toLowerCase().includes("engine")
        if (unsupported) continue
        throw err
      }
    }

    if (lastErr) throw lastErr
    return null
  } catch (err) {
    console.warn("Evolution voice: AWS Polly TTS failed", err?.message || err)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TTS — OPENAI
// ─────────────────────────────────────────────────────────────────────────────

async function synthesizeOpenAiTts(text) {
  if (!OPENAI_API_KEY) return null
  const trimmed = String(text || "").trim()
  if (!trimmed) return null

  const model = String(process.env.OPENAI_TTS_MODEL || "tts-1").trim()
  const voice = String(process.env.OPENAI_TTS_VOICE || "alloy").trim()

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 120000)
  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method:  "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ model, voice, input: trimmed.slice(0, 4096), response_format: "mp3" }),
      signal:  controller.signal,
    })
    if (!res.ok) {
      console.warn("Evolution voice: OpenAI TTS error", { status: res.status })
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    return buf.length ? buf.toString("base64") : null
  } catch (err) {
    console.warn("Evolution voice: OpenAI TTS failed", err?.message || err)
    return null
  } finally {
    clearTimeout(t)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TTS — OLLAMA
// ─────────────────────────────────────────────────────────────────────────────

async function synthesizeOllamaTts(text, { modelOverride } = {}) {
  const trimmed = String(text || "").trim()
  if (!trimmed) return null
  const base  = normalizeOllamaBase()
  const model = String(modelOverride || process.env.OLLAMA_TTS_MODEL || "tts-1").trim()
  const voice = String(process.env.OLLAMA_TTS_VOICE || "alloy").trim()

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 120000)
  try {
    const res = await fetch(`${base}/v1/audio/speech`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", ...ollamaAuthHeadersJson() },
      body:    JSON.stringify({ model, voice, input: trimmed.slice(0, 4096), response_format: "mp3" }),
      signal:  controller.signal,
    })
    if (!res.ok) {
      console.warn("Evolution voice: Ollama TTS error", { status: res.status })
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    return buf.length ? buf.toString("base64") : null
  } catch (err) {
    console.warn("Evolution voice: Ollama TTS failed", err?.message || err)
    return null
  } finally {
    clearTimeout(t)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TTS — ELEVENLABS
// ─────────────────────────────────────────────────────────────────────────────

async function synthesizeElevenLabsTts(text, { replyLanguage } = {}) {
  if (!ELEVENLABS_API_KEY) return null
  const trimmed = String(text || "").trim()
  if (!trimmed) return null

  const voiceId = pickElevenLabsVoiceId(replyLanguage)
  if (!voiceId) {
    console.warn("Evolution voice: ELEVENLABS_VOICE_ID_EN / ELEVENLABS_VOICE_ID_AR required")
    return null
  }

  const modelId        = String(process.env.ELEVENLABS_MODEL_ID        || "eleven_multilingual_v2").trim()
  const outputFormat   = String(process.env.ELEVENLABS_OUTPUT_FORMAT    || "mp3_44100_128").trim()
  const stability      = Number(process.env.ELEVENLABS_STABILITY        || 0.45)
  const similarityBoost = Number(process.env.ELEVENLABS_SIMILARITY_BOOST || 0.75)
  const style          = Number(process.env.ELEVENLABS_STYLE            || 0.2)
  const speakerBoost   = String(process.env.ELEVENLABS_SPEAKER_BOOST   || "true").trim().toLowerCase() !== "false"

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 120000)
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(outputFormat)}`,
      {
        method:  "POST",
        headers: {
          "xi-api-key":   ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept:         "audio/mpeg",
        },
        body: JSON.stringify({
          text:           trimmed.slice(0, 4500),
          model_id:       modelId,
          voice_settings: { stability, similarity_boost: similarityBoost, style, use_speaker_boost: speakerBoost },
        }),
        signal: controller.signal,
      }
    )
    if (!res.ok) {
      console.warn("Evolution voice: ElevenLabs TTS error", { status: res.status })
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    return buf.length ? buf.toString("base64") : null
  } catch (err) {
    console.warn("Evolution voice: ElevenLabs TTS failed", err?.message || err)
    return null
  } finally {
    clearTimeout(t)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TTS — FALLBACK CHAINS
// ─────────────────────────────────────────────────────────────────────────────

async function runFallbackChain(text, opts, excluding) {
  const steps = parseVoiceTtsFallbackSteps().filter((s) => s !== excluding)
  for (const step of steps) {
    let b64 = null
    if (step === "edge")   b64 = await synthesizeEdgeTts(text, opts)
    if (step === "aws")    b64 = await synthesizeAwsTts(text, opts)
    if (step === "openai" && OPENAI_API_KEY) b64 = await synthesizeOpenAiTts(text)
    if (step === "ollama") b64 = await synthesizeOllamaTts(text)
    if (b64) {
      console.log(`Evolution voice: TTS fallback used ${step}`)
      return b64
    }
  }
  return null
}

async function synthesizeEdgeWithFallbacks(text, opts) {
  const b64 = await synthesizeEdgeTts(text, opts)
  if (b64) return b64
  return runFallbackChain(text, opts, "edge")
}

async function synthesizeAwsWithFallbacks(text, opts) {
  const b64 = await synthesizeAwsTts(text, opts)
  if (b64) return b64
  return runFallbackChain(text, opts, "aws")
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SYNTHESIZE ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

async function synthesizeSpeechToMp3Base64(text, opts = {}) {
  let replyLanguage = opts.replyLanguage
  if (replyLanguage !== "ar" && replyLanguage !== "en") {
    replyLanguage = containsArabicScript(text) ? "ar" : "en"
  }

  const p = pickTtsProvider()
  const o = { replyLanguage }

  if (p === "none")       return null
  if (p === "edge")       return synthesizeEdgeWithFallbacks(text, o)
  if (p === "aws")        return synthesizeAwsWithFallbacks(text, o)
  if (p === "elevenlabs") return synthesizeElevenLabsTts(text, o)
  if (p === "openai")     return synthesizeOpenAiTts(text)

  if (p === "ollama") {
    // For inbound voice replies, try a specific Ollama TTS model if configured
    if (opts.preferOllamaForInboundVoice) {
      const model = String(process.env.OLLAMA_TTS_MODEL_VOICE_INBOUND || process.env.OLLAMA_TTS_MODEL || "tts-1").trim()
      const b64   = await synthesizeOllamaTts(text, { modelOverride: model })
      if (b64) return b64
      console.warn("Evolution voice: Ollama inbound voice TTS failed — trying fallbacks")
    }
    const b64 = await synthesizeOllamaTts(text)
    if (b64) return b64
    return runFallbackChain(text, o, "ollama")
  }

  // Final catch-all
  return synthesizeEdgeWithFallbacks(text, o)
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  isVoiceReplyEnabled,
  sendTextWithVoiceAlso,
  canTranscribe,
  canSynthesize,
  transcribeEvolutionVoiceNote,
  synthesizeSpeechToMp3Base64,
  evolutionPostMediaWithRetry,
  evolutionGetMediaWithRetry,
  audioMp3Base64ForEvolutionSend,
  whatsAppAudioEncodingDefaultOn,
}