/**
 * Language routing for Arabic vs English (text + voice pipeline).
 * Matches ratio-based detection: ≥30% Arabic letters in letter content → Arabic.
 */

function detectLanguage(text) {
  const s = String(text || "").trim()
  if (!s) return "en"

  const arabicChars = (s.match(/[\u0600-\u06FF]/g) || []).length
  const totalLetters = (s.match(/[a-zA-Z\u0600-\u06FF]/g) || []).length

  if (totalLetters === 0) return "en"

  const arabicRatio = arabicChars / totalLetters
  if (arabicRatio >= 0.3) return "ar"
  return "en"
}

/** Map faster-whisper / Whisper `info.language` codes to reply lane. */
function whisperLanguageToReplyLang(lang) {
  const s = String(lang || "").trim().toLowerCase()
  if (!s) return null
  if (s.startsWith("ar")) return "ar"
  return "en"
}

module.exports = { detectLanguage, whisperLanguageToReplyLang }
