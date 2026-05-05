/**
 * Local STT via Python `faster-whisper` (no API key, no OpenAI servers).
 *
 * Requires: pip install faster-whisper
 * Optional GPU: set WHISPER_FASTER_DEVICE=cuda WHISPER_FASTER_COMPUTE=float16
 *
 * Env:
 * - VOICE_STT_PROVIDER=faster-whisper (or auto picks this when Python + faster_whisper OK)
 * - WHISPER_FASTER_MODEL — tiny|base|small|medium|large-v2|large-v3 (default small)
 * - WHISPER_FASTER_LANGUAGE — ar|en|... or empty for auto
 * - WHISPER_FASTER_PYTHON — path to python (else tries py -3, python3, python)
 * - WHISPER_FASTER_TIMEOUT_MS — subprocess cap (default 300000)
 */

const fs = require("fs")
const os = require("os")
const path = require("path")
const { spawnSync } = require("child_process")
const { convertToWav16kMono, canRunNodeStt } = require("./nodeWhisperStt")
const { detectLanguage, whisperLanguageToReplyLang } = require("./langDetect")

let resolvedPython = null

function getScriptPath() {
  return path.join(__dirname, "..", "scripts", "faster_whisper_stt.py")
}

function getPythonCandidates() {
  const custom = String(process.env.WHISPER_FASTER_PYTHON || "").trim()
  if (custom) {
    if (fs.existsSync(custom)) {
      return [[custom]]
    }
    return [custom.split(/\s+/).filter(Boolean)]
  }
  if (process.platform === "win32") {
    return [["py", "-3"], ["python"], ["python3"]]
  }
  return [["python3"], ["python"]]
}

function resolvePython() {
  if (resolvedPython !== null) return resolvedPython
  const script = getScriptPath()
  if (!fs.existsSync(script)) {
    resolvedPython = false
    return resolvedPython
  }
  for (const parts of getPythonCandidates()) {
    if (!parts.length) continue
    const bin = parts[0]
    const rest = parts.slice(1)
    const r = spawnSync(bin, [...rest, "-c", "import faster_whisper"], {
      encoding: "utf-8",
      timeout: 25000,
      windowsHide: true,
    })
    if (r.status === 0) {
      resolvedPython = parts
      return resolvedPython
    }
  }
  resolvedPython = false
  return resolvedPython
}

function canRunFasterWhisperStt() {
  if (!canRunNodeStt()) return false
  const p = resolvePython()
  return Array.isArray(p) && p.length > 0
}

function getFasterWhisperModel() {
  return String(process.env.WHISPER_FASTER_MODEL || "small").trim() || "small"
}

function fasterWhisperTimeoutMs() {
  return Math.min(Math.max(Number(process.env.WHISPER_FASTER_TIMEOUT_MS) || 300000, 60000), 900000)
}

/**
 * @param {Buffer} buffer
 * @param {string} inputExt
 * @returns {Promise<{ text: string, language: 'ar'|'en' }|null>}
 */
async function transcribeWithFasterWhisper(buffer, inputExt = "ogg") {
  if (!buffer?.length) return null
  if (!canRunNodeStt()) {
    console.warn("Evolution voice: faster-whisper STT needs ffmpeg-static (decode to WAV)")
    return null
  }
  const pyParts = resolvePython()
  if (!pyParts || pyParts === false) {
    console.warn(
      "Evolution voice: faster-whisper not available. Install: pip install faster-whisper (see scripts/requirements-faster-whisper.txt)"
    )
    return null
  }

  const ext = String(inputExt || "ogg").replace(/^\./, "") || "ogg"
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "waseel-faster-whisper-"))
  const inFile = path.join(tmpDir, `in.${ext}`)
  const wavFile = path.join(tmpDir, "out.wav")

  const model = getFasterWhisperModel()
  const langRaw = String(process.env.WHISPER_FASTER_LANGUAGE || "").trim()
  const langArg = langRaw || "auto"

  try {
    fs.writeFileSync(inFile, buffer)
    convertToWav16kMono(inFile, wavFile)

    const scriptPath = getScriptPath()
    const args = [...pyParts.slice(1), scriptPath, wavFile, model, langArg]
    const r = spawnSync(pyParts[0], args, {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
      timeout: fasterWhisperTimeoutMs(),
      windowsHide: true,
      env: { ...process.env },
    })

    if (r.status !== 0) {
      const errLine = String(r.stderr || r.stdout || r.error || "unknown error").trim()
      console.warn("Evolution voice: faster-whisper STT failed", {
        status: r.status,
        details: errLine.slice(0, 500),
      })
      return null
    }

    let parsed
    try {
      parsed = JSON.parse(String(r.stdout || "").trim())
    } catch {
      console.warn("Evolution voice: faster-whisper invalid JSON stdout", String(r.stdout || "").slice(0, 200))
      return null
    }

    if (parsed.error) {
      console.warn("Evolution voice: faster-whisper", parsed.error)
      return null
    }

    const text = String(parsed.text || "")
      .trim()
      .replace(/^\uFEFF/, "")
    if (!text) return null

    const whisperLang = whisperLanguageToReplyLang(parsed.language)
    const language = whisperLang === "ar" || whisperLang === "en" ? whisperLang : detectLanguage(text) === "ar" ? "ar" : "en"
    return { text, language }
  } catch (err) {
    console.warn("Evolution voice: faster-whisper STT error", err?.message || err)
    return null
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch (_) {}
  }
}

function resetPythonProbeForTests() {
  resolvedPython = null
}

module.exports = {
  transcribeWithFasterWhisper,
  canRunFasterWhisperStt,
  getFasterWhisperModel,
  resetPythonProbeForTests,
}
