/**
 * Local Whisper STT in Node (no Python): @xenova/transformers + ffmpeg-static.
 *
 * Env:
 * - WHISPER_NODE_MODEL — default Xenova/whisper-small (multilingual; good ar+en). Try Xenova/whisper-medium if you have RAM.
 * - WHISPER_TRANSFORMERS_CACHE — optional cache directory for model files
 */

const fs = require("fs")
const os = require("os")
const path = require("path")
const { spawnSync } = require("child_process")
const { WaveFile } = require("wavefile")
const { detectLanguage } = require("./langDetect")

let ffmpegPath = null
try {
  ffmpegPath = require("ffmpeg-static")
} catch {
  ffmpegPath = null
}

let transcriberPromise = null

function getWhisperModelId() {
  return String(process.env.WHISPER_NODE_MODEL || "Xenova/whisper-small").trim()
}

function canRunNodeStt() {
  return !!ffmpegPath
}

async function getTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { pipeline, env } = await import("@xenova/transformers")
      const cacheDir = String(process.env.WHISPER_TRANSFORMERS_CACHE || "").trim()
      if (cacheDir) {
        env.cacheDir = cacheDir
      }
      const model = getWhisperModelId()
      console.log("Evolution voice: loading Whisper model (first run may download weights)...", { model })
      return pipeline("automatic-speech-recognition", model)
    })()
  }
  return transcriberPromise
}

function convertToWav16kMono(inputPath, outputPath) {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static binary not found")
  }
  const r = spawnSync(
    ffmpegPath,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      inputPath,
      "-ar",
      "16000",
      "-ac",
      "1",
      "-acodec",
      "pcm_s16le",
      "-y",
      outputPath,
    ],
    { encoding: "utf-8", maxBuffer: 20 * 1024 * 1024 }
  )
  if (r.status !== 0) {
    throw new Error(String(r.stderr || r.stdout || "ffmpeg failed"))
  }
}

/**
 * Raw Float32 samples at 16 kHz mono for @xenova/transformers in Node (no AudioContext).
 * See https://huggingface.co/docs/transformers.js/guides/node-audio-processing
 *
 * @param {string} wavFilePath
 * @returns {Float32Array}
 */
function wavFileToFloat32Mono16k(wavFilePath) {
  const wav = new WaveFile(fs.readFileSync(wavFilePath))
  wav.toBitDepth("32f")
  wav.toSampleRate(16000)

  let audioData = wav.getSamples(false, Float32Array)
  if (Array.isArray(audioData)) {
    const scale = Math.sqrt(2)
    const left = audioData[0]
    const right = audioData[1]
    for (let i = 0; i < left.length; i++) {
      left[i] = (scale * (left[i] + right[i])) / 2
    }
    audioData = left
  }
  if (!(audioData instanceof Float32Array)) {
    audioData = Float32Array.from(audioData)
  }
  return audioData
}

/**
 * @param {Buffer} buffer
 * @param {string} inputExt
 * @returns {Promise<{ text: string, language: 'ar'|'en' }|null>}
 */
async function transcribeWithNodeWhisper(buffer, inputExt = "ogg") {
  if (!buffer?.length) return null
  if (!ffmpegPath) {
    console.warn("Evolution voice: Node STT requires ffmpeg-static")
    return null
  }

  const ext = String(inputExt || "ogg").replace(/^\./, "") || "ogg"
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "waseel-whisper-"))
  const inFile = path.join(tmpDir, `in.${ext}`)
  const wavFile = path.join(tmpDir, "out.wav")

  try {
    fs.writeFileSync(inFile, buffer)
    convertToWav16kMono(inFile, wavFile)

    const transcriber = await getTranscriber()
    const audioData = wavFileToFloat32Mono16k(wavFile)
    const out = await transcriber(audioData, { task: "transcribe" })
    const text = String(out?.text || "")
      .trim()
      .replace(/^\uFEFF/, "")
    if (!text) return null

    const language = detectLanguage(text) === "ar" ? "ar" : "en"
    return { text, language }
  } catch (err) {
    console.warn("Evolution voice: Node Whisper STT failed", err?.message || err)
    return null
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch (_) {}
  }
}

module.exports = {
  transcribeWithNodeWhisper,
  getWhisperModelId,
  canRunNodeStt,
  convertToWav16kMono,
}
