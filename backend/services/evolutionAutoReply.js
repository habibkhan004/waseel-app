/**
 * Evolution (WhatsApp) auto-reply: replies use the local Ollama HTTP API with Qwen (`OLLAMA_MODEL`) + Arabic model (`OLLAMA_MODEL_ARABIC`).
 * "Ollama" is the runtime app (`ollama serve`), not Meta’s LLaMA family — pull Qwen explicitly: `ollama pull qwen2.5:14b`.
 * Voice: EVOLUTION_VOICE_REPLY=true — STT (Python faster-whisper, Node Whisper, Ollama API, or cloud) + TTS. See evolutionVoice.js, fasterWhisperStt.js, nodeWhisperStt.js.
 * Voice-out: by default only when the customer sent a voice note. Set EVOLUTION_VOICE_REPLY_ALWAYS=true to TTS every reply (still requires EVOLUTION_VOICE_REPLY=true and working TTS).
 * Evolution client: EVOLUTION_AXIOS_TIMEOUT_MS (default 60000) — raise if findChats / poll often times out at 15s.
 * Poll scope: EVOLUTION_POLL_ONLY_CHATS_WITH_UNREAD=true — only fetch messages when Evolution reports unread (optional). Default scans recent chats but primes cold threads so we do not mass-reply backlog.
 * OLLAMA_FETCH_TIMEOUT_MS (default 180000) for /api/chat — large models may need more time.
 * Latency: OLLAMA_NUM_PREDICT (shorter = faster), OLLAMA_CHAT_HISTORY_MAX, OLLAMA_NUM_CTX, OLLAMA_CATALOG_* caps, EVOLUTION_AUTO_REPLY_POLL_MS / DELAY.
 * Gulf + history: EVOLUTION_GULF_SHOP_MODE=true, optional OLLAMA_CHAT_HISTORY_MAX (default 16 when Gulf on). Lang: services/langDetect.js (text) + Whisper language (voice).
 */

const axios = require("axios")
const voice = require("./evolutionVoice")
const { canRunNodeStt, getWhisperModelId } = require("./nodeWhisperStt")
const { canRunFasterWhisperStt, getFasterWhisperModel } = require("./fasterWhisperStt")
const { detectLanguage } = require("./langDetect")
const Product = require("../models/Product")
const Service = require("../models/Service")
const StoreConnection = require("../models/StoreConnection")
const User = require("../models/User")
const { fetchWebsiteProductsForReply } = require("./websiteProductScraper")
const WhatsappMessage = require("../models/WhatsappMessage")

// ─────────────────────────────────────────────────────────────────────────────
// ENV + CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const EVOLUTION_BASE_URL = process.env.EVOLUTION_URL || "http://187.127.139.73:8080"

const EVOLUTION_AXIOS_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.EVOLUTION_AXIOS_TIMEOUT_MS) || 60000, 5000),
  600000
)

const evolutionClient = axios.create({
  baseURL: EVOLUTION_BASE_URL,
  timeout: EVOLUTION_AXIOS_TIMEOUT_MS,
  headers: {
    apikey: process.env.EVOLUTION_KEY,
    "Content-Type": "application/json",
  },
})

const DELAY_BETWEEN_REPLIES_MS =
  Number(process.env.EVOLUTION_AUTO_REPLY_DELAY_MS || process.env.GROK_AUTO_REPLY_DELAY_MS) || 2500
const POLL_INTERVAL_MS = Number(process.env.EVOLUTION_AUTO_REPLY_POLL_MS) || 8000
const EVOLUTION_AUTO_REPLY_TRANSPORT = String(process.env.EVOLUTION_AUTO_REPLY_TRANSPORT || "poll")
  .trim()
  .toLowerCase()
const CHATS_LIMIT = Math.min(Math.max(Number(process.env.EVOLUTION_AUTO_REPLY_CHATS_LIMIT) || 20, 1), 200)
const MESSAGES_PER_CHAT = Math.min(Math.max(Number(process.env.EVOLUTION_AUTO_REPLY_MESSAGES_PER_CHAT) || 6, 1), 50)
const MAX_REPLY_LENGTH = 2500
const REQUIRE_UNREAD_CHAT_COUNT =
  String(process.env.EVOLUTION_REQUIRE_UNREAD_CHAT_COUNT || "false").trim().toLowerCase() === "true"
const POLL_ONLY_CHATS_WITH_UNREAD =
  String(process.env.EVOLUTION_POLL_ONLY_CHATS_WITH_UNREAD || "false").trim().toLowerCase() === "true"
const PRIME_RECENT_INBOUND_MS = Math.min(
  Math.max(Number(process.env.EVOLUTION_PRIME_RECENT_INBOUND_MS) || 120000, 5000),
  24 * 3600000
)
const POLL_ONLY_UNREAD_MESSAGES =
  String(process.env.EVOLUTION_POLL_ONLY_UNREAD_MESSAGES || "false").trim().toLowerCase() === "true"
const MARK_MESSAGE_READ =
  String(process.env.EVOLUTION_MARK_MESSAGE_READ || "true").trim().toLowerCase() !== "false"
const EVOLUTION_VOICE_REPLY_ALWAYS =
  String(process.env.EVOLUTION_VOICE_REPLY_ALWAYS || "").trim().toLowerCase() === "true"

// Ollama
const OLLAMA_URL           = String(process.env.OLLAMA_URL           || "http://127.0.0.1:11434").trim()
const OLLAMA_MODEL         = String(process.env.OLLAMA_MODEL         || "qwen2.5:14b").trim()
const OLLAMA_MODEL_ARABIC  = String(process.env.OLLAMA_MODEL_ARABIC  || "iKhalid/ALLaM:7b").trim()
const OLLAMA_TEMPERATURE   = Number(process.env.OLLAMA_TEMPERATURE)  || 0.82
const OLLAMA_NUM_PREDICT   = Number(process.env.OLLAMA_NUM_PREDICT)  || 200

const OLLAMA_NUM_CTX = (() => {
  const n = Number(process.env.OLLAMA_NUM_CTX)
  if (!Number.isFinite(n) || n < 1024) return null
  return Math.min(Math.max(Math.floor(n), 1024), 131072)
})()

const OLLAMA_CATALOG_DESC_MAX = Math.min(
  Math.max(Number(process.env.OLLAMA_CATALOG_DESC_MAX_CHARS) || 140, 40),
  800
)
const OLLAMA_CATALOG_MAX_PRODUCTS = Math.min(
  Math.max(Number(process.env.OLLAMA_CATALOG_MAX_PRODUCTS) || 6, 2),
  20
)
const OLLAMA_CATALOG_MAX_SERVICES = Math.min(
  Math.max(Number(process.env.OLLAMA_CATALOG_MAX_SERVICES) || 6, 2),
  20
)

const EVOLUTION_GULF_SHOP_MODE =
  String(process.env.EVOLUTION_GULF_SHOP_MODE || "true").trim().toLowerCase() !== "false"

const OLLAMA_CHAT_HISTORY_MAX = Math.min(
  Math.max(
    Number(
      process.env.OLLAMA_CHAT_HISTORY_MAX !== undefined
        ? process.env.OLLAMA_CHAT_HISTORY_MAX
        : 16
    ) || 16,
    0
  ),
  32
)

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPTS
// ─────────────────────────────────────────────────────────────────────────────
const WASEEL_SHOP_RULES_APPENDIX = `
If asked about something not in stock: say something like "let me check on that" or "خليني أشوف" — never say "not in catalog" or "not listed".
Never invent products, prices, or stock. Use exact names from the catalog.
Don't push products they didn't ask about.
Never say the word "catalog". Never reveal you are AI or a bot.
Never say: "I'd be happy to" / "Certainly" / "Great question" / "How can I assist" / "Let me know if you need anything else" / "يسعدني" / "بكل سرور" / "لا تتردد".
`

const HUMAN_WHATSAPP_STYLE_AR = `
رسايل قصيرة وعفوية — زي الواتساب الحقيقي، مو مقال ومو روبوت.
سطر أو سطرين في الغالب. مو فقرات منظمة. مو ترقيم ١٢٣.
`

const HUMAN_WHATSAPP_STYLE_EN = `
Short casual WhatsApp texts only — not essays, not bullet points, not structured replies.
1 to 3 sentences max for most replies. Fragments are fine. Contractions always.
`

const GULF_SYSTEM_AR = (businessName, businessDesc) => `أنت ${businessName} — صاحب ${businessDesc} ترد على زبائنك بنفسك على الواتساب. إنسان حقيقي، مو روبوت.

اقرأ هذه الأمثلة وتكلم بنفس الأسلوب تماماً — قصير، عفوي، خليجي:

[تحية]
زبون: السلام عليكم
أنت: وعليكم السلام، كيفك 😊

زبون: هلا
أنت: هلا فيك، وش تبغي؟

زبون: صباح الخير
أنت: صباح النور، وش أقدر أساعدك؟

[سؤال عن منتج موجود في القائمة]
زبون: عندك [اسم المنتج]؟
أنت: إي والله عندي، [سؤال متابعة طبيعي أو السعر مباشرة]

زبون: بكم؟
أنت: [السعر من القائمة فقط]

زبون: يوصل [المدينة]؟
أنت: أكيد، شحن سريع

زبون: في ضمان؟
أنت: إي في ضمان [المدة لو موجودة]

[سؤال عن شي ما عندك أو ما تعرف]
زبون: عندك [شي مو في القائمة]؟
أنت: خليني أشوف عندي إياه

زبون: متى يوصل؟
أنت: أشوف وأعطيك خبر

[اعتراض على السعر]
زبون: غالي
أنت: والله هذا سعره الحين، وش ميزانيتك؟

[شكر وختام]
زبون: شكراً
أنت: يزاك الله خير 🙏

━━━━━━━━━━━━━━━━━
اللغة:
━━━━━━━━━━━━━━━━━
خليجي عامي فقط: وش، شلونك، زين، والله، يبه، طيب، الحين، ليش، أبغى، خوش، عاد، ياخي
مو فصحى رسمية. مو أردي. مو هندي.
لو الزبون كتب إنجليزي، رد إنجليزي بسيط.

${HUMAN_WHATSAPP_STYLE_AR}
${WASEEL_SHOP_RULES_APPENDIX}`

const GULF_SYSTEM_EN = (businessName, businessDesc) => `You are ${businessName} — a real ${businessDesc} owner texting customers personally on WhatsApp. A real person, not a bot.

Read these examples and talk exactly like this — short, casual, direct:

[Greeting]
Customer: hi
You: hey, what do you need?

Customer: hello
You: hey 👋 what can I help with?

Customer: good morning
You: morning! what do you need?

[Product in stock]
Customer: do you have [product]?
You: yeah, [follow-up question or price directly]

Customer: how much?
You: [price from catalog only]

Customer: do you ship to [city]?
You: yeah, fast delivery

Customer: is there a warranty?
You: yeah, [duration if available]

[Product not in catalog or unsure]
Customer: do you have [unknown product]?
You: lemme check on that

Customer: when will it arrive?
You: I'll check and let you know

[Price objection]
Customer: that's expensive
You: that's the going rate right now, what's your budget?

[Closing]
Customer: thanks
You: anytime 🙏

━━━━━━━━━━━━━━━━━
Language:
━━━━━━━━━━━━━━━━━
Casual English only. Contractions always (yeah, don't, it's, lemme, gonna).
Short sentences. Lowercase is fine. No essays.
"wa alaykum assalam" only when they say salam — only Arabic allowed.
No Urdu. No Hindi. No Gulf slang in English mode.

━━━━━━━━━━━━━━━━━
Reply length:
━━━━━━━━━━━━━━━━━
Greeting → 1 line back, nothing more.
Simple question → 1 direct answer, no padding.
Product question → name + price + one useful detail max.
Never write more than 3 sentences unless they asked something complex.

${HUMAN_WHATSAPP_STYLE_EN}
${WASEEL_SHOP_RULES_APPENDIX}`

// Always use Gulf prompts — OLLAMA_SYSTEM_DEFAULT points to English Gulf prompt
const OLLAMA_SYSTEM_DEFAULT = GULF_SYSTEM_EN

// Allow full override via env
const OLLAMA_SYSTEM_INSTRUCTION =
  String(process.env.OLLAMA_SYSTEM_INSTRUCTION || "").trim() || OLLAMA_SYSTEM_DEFAULT

// ─────────────────────────────────────────────────────────────────────────────
// STATE MAPS
// ─────────────────────────────────────────────────────────────────────────────

const lastSentTo                = new Map() // remoteJid -> lastSentReceivedAtMs
const ollamaChatHistories       = new Map() // remoteJid -> { role, content }[]
const lastProcessedByRemoteJid  = new Map() // remoteJid -> messageTimestampSeconds
const enqueuedMessageSignatures = new Map() // signature  -> firstSeenReceivedAtMs

const DEDUPE_WINDOW_MS       = Number(process.env.EVOLUTION_AUTO_REPLY_DEDUPE_WINDOW_MS) || 30000
const SEEN_SIGNATURE_TTL_MS  = Number(process.env.EVOLUTION_AUTO_REPLY_SEEN_SIGNATURE_TTL_MS) || 10 * 60 * 1000
const SIGNATURE_BUCKET_MS    = Number(process.env.EVOLUTION_AUTO_REPLY_SIGNATURE_BUCKET_MS) || 30000

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getInstanceName(userId) {
  return `user_${String(userId)}`.trim()
}

function evolutionRecipientNumber(remoteJidOrNumber) {
  const s = String(remoteJidOrNumber || "").trim()
  if (!s) return s
  if (s.includes("@g.us")) return s
  if (s.endsWith("@lid")) return s
  const before = s.split("@")[0]
  return before.replace(/\D/g, "") || before
}

function throttleKeyForItem(item) {
  return String(item.to || "").trim()
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function containsArabicScript(text) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(String(text || ""))
}

function isPureGreetingMessage(text) {
  const t = String(text || "").trim()
  if (!t || t.length > 60) return false
  return /^(سلام|هلا|مرحبا|مرحباً|اهلاً|أهلاً|أهلا|اهلا|صباح الخير|مساء الخير|كيف الحال|شلونك|شخبارك|hi|hello|hey|salam|good\s*(morning|evening|afternoon|day)|howdy|greetings|sup|what'?s?\s*up)[!؟?\s.،,]*$/i.test(t)
}

function truncateForPrompt(text, maxLen) {
  const t = String(text || "").replace(/\s+/g, " ").trim()
  if (!maxLen || t.length <= maxLen) return t
  return `${t.slice(0, maxLen - 1).trim()}…`
}

function cleanReplyText(raw) {
  return String(raw || "")
    .trim()
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")  // remove **bold** and *italic*
    .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")     // remove __underline__
    .replace(/`{1,3}[^`]*`{1,3}/g, "")         // remove `code`
    .replace(/^#{1,6}\s+/gm, "")               // remove ## headings
    .replace(/^\s*[-•*]\s+/gm, "")             // remove bullet points
    .replace(/^\s*\d+\.\s+/gm, "")             // remove numbered lists
    .replace(/\n{3,}/g, "\n\n")                // collapse excess newlines
    .trim()
    .slice(0, MAX_REPLY_LENGTH)
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTANCE / USER RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

async function getInstanceConnectionState(instanceName) {
  try {
    const { data } = await voice.evolutionGetMediaWithRetry(
      evolutionClient,
      `/instance/connectionState/${encodeURIComponent(instanceName)}`
    )
    return { ok: true, data }
  } catch (err) {
    const status = err?.response?.status
    if (status === 404) return { ok: false, notFound: true, err }
    return { ok: false, notFound: false, err }
  }
}

async function fetchEvolutionInstances() {
  try {
    const resp = await voice.evolutionGetMediaWithRetry(evolutionClient, `/instance/fetchInstances`)
    const data = resp?.data
    const instances = Array.isArray(data?.instances)
      ? data.instances
      : Array.isArray(data?.data?.instances)
        ? data.data.instances
        : Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : []
    return { ok: true, instances, raw: data }
  } catch (err) {
    console.error("Evolution auto-reply: fetchInstances failed", {
      status:  err?.response?.status,
      details: err?.response?.data || err?.message,
    })
    return { ok: false, err }
  }
}

function extractUserIdFromInstanceName(instanceName) {
  const s = String(instanceName || "").trim()
  if (!s) return null
  if (s.startsWith("user_")) return s.slice("user_".length)
  return null
}

async function pickOwnerUserIdFromInstances() {
  const res = await fetchEvolutionInstances()
  if (!res.ok) return null
  const instances = res.instances
  if (!instances.length) return null

  console.log("Evolution auto-reply: instances available", {
    count:  instances.length,
    sample: instances.slice(0, 10).map((i) => ({
      instanceName: i?.instanceName || i?.name || "",
      state:        i?.connectionState || i?.state || i?.connection?.state || "",
    })),
  })

  const preferred = instances.find((i) => {
    const name  = i?.instanceName || i?.name || ""
    const state = i?.connectionState || i?.state || i?.connection?.state || ""
    const uid   = extractUserIdFromInstanceName(name)
    if (!uid) return false
    const st = String(state || "").toLowerCase()
    return st && st !== "close" && st !== "closed" && st !== "disconnected"
  })

  const chosen     = preferred || instances.find((i) => extractUserIdFromInstanceName(i?.instanceName || i?.name))
  const chosenName = chosen?.instanceName || chosen?.name || ""
  const uid        = extractUserIdFromInstanceName(chosenName)
  if (!uid) return null

  console.log("Evolution auto-reply: picked owner from instances", {
    instanceName: chosenName,
    state:        chosen?.connectionState || chosen?.state,
  })
  return uid
}

async function getOwnerUserId() {
  const envId = String(process.env.EVOLUTION_AUTO_REPLY_USER_ID || "").trim()
  if (envId) return envId
  const withProduct = await Product.findOne({}).select("userId").lean()
  if (withProduct?.userId) return String(withProduct.userId)
  const withService = await Service.findOne({}).select("userId").lean()
  if (withService?.userId) return String(withService.userId)
  const firstUser = await User.findOne({}).select("_id").lean()
  return firstUser?._id ? String(firstUser._id) : null
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG
// ─────────────────────────────────────────────────────────────────────────────

async function getCatalogForUser(userId) {
  if (!userId) return { products: [], services: [] }
  const [products, services, customStores] = await Promise.all([
    Product.find({ userId, source: { $ne: "custom_website" } })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean(),
    Service.find({ userId }).sort({ createdAt: -1 }).limit(500).lean(),
    StoreConnection.find({ userId, provider: "custom_website" }).lean(),
  ])

  /**
   * Custom websites: fetch public HTML (JSON-LD, common product blocks, or page excerpt).
   * Not stored in MongoDB for AI — read fresh (cached a few minutes) when building the reply.
   */
  const list = [...(products || [])]
  for (const conn of customStores || []) {
    try {
      const rows = await fetchWebsiteProductsForReply(conn, { useCache: true })
      for (const row of rows) {
        list.push({
          name: row.name,
          description: row.description,
          price: row.price,
          currency: row.currency,
          stock: row.stock,
          category: row.category,
          image: row.image,
        })
      }
    } catch (err) {
      console.warn("[getCatalogForUser] custom website scrape:", conn?.shopDomain, err?.message || err)
    }
  }

  return { products: list.slice(0, 550), services: services || [] }
}

function buildCatalogContext(catalog) {
  const { products, services } = catalog || {}
  const parts = []

  parts.push("--- FULL CATALOG ---")

  if ((products || []).length) {
    parts.push(
      "PRODUCTS (" + products.length + "):\n" +
      products.map((p) => {
        const desc  = truncateForPrompt((p.description || "").trim() || "No description.", OLLAMA_CATALOG_DESC_MAX)
        const price = `${p.price} ${p.currency || "SAR"}`
        const stock = p.stock != null ? ` Stock: ${p.stock}.` : ""
        return `• ${p.name} — ${price}.${stock} ${desc}`
      }).join("\n")
    )
  }

  if ((services || []).length) {
    parts.push(
      "SERVICES (" + services.length + "):\n" +
      services.map((s) => {
        const desc  = truncateForPrompt((s.description || "").trim() || "No description.", OLLAMA_CATALOG_DESC_MAX)
        const price = `${s.price} ${s.currency || "SAR"}`
        return `• ${s.name} (${s.category || "General"}) — ${price}. ${desc}`
      }).join("\n")
    )
  }

  parts.push("--- END CATALOG ---")
  return parts.length > 2 ? parts.join("\n\n") : "No products or services listed yet."
}

function tokenizeForMatching(text) {
  const s = String(text || "")
  const parts = s.match(/[\p{L}\p{N}]+/gu) || []
  return parts
    .map((w) => String(w).trim().toLowerCase())
    .filter((w) => {
      const t = String(w || "").trim().toLowerCase()
      if (!t) return false
      if (t.length >= 2) return true
      return t.length === 1 && (/^\d$/.test(t) || t === "x")
    })
}

function buildRelevantCatalogContext(
  catalog,
  incomingBody,
  maxProducts = OLLAMA_CATALOG_MAX_PRODUCTS,
  maxServices = OLLAMA_CATALOG_MAX_SERVICES
) {
  const { products, services } = catalog || {}
  const messageWords = new Set(tokenizeForMatching(incomingBody))
  if (!messageWords.size) return buildCatalogContext(catalog)

  const scoredProducts = (products || []).map((p) => {
    const kw = new Set([
      ...tokenizeForMatching(p?.name),
      ...tokenizeForMatching(p?.category),
      ...tokenizeForMatching(p?.description),
    ])
    let score = 0
    for (const w of messageWords) if (kw.has(w)) score++
    return { item: p, score }
  })

  const scoredServices = (services || []).map((s) => {
    const kw = new Set([
      ...tokenizeForMatching(s?.name),
      ...tokenizeForMatching(s?.category),
      ...tokenizeForMatching(s?.description),
    ])
    let score = 0
    for (const w of messageWords) if (kw.has(w)) score++
    return { item: s, score }
  })

  scoredProducts.sort((a, b) => b.score - a.score)
  scoredServices.sort((a, b) => b.score - a.score)

  const bestProducts = scoredProducts.filter((x) => x.score > 0).slice(0, maxProducts).map((x) => x.item)
  const bestServices = scoredServices.filter((x) => x.score > 0).slice(0, maxServices).map((x) => x.item)

  const finalProducts = bestProducts.length ? bestProducts : (products || []).slice(0, maxProducts)
  const finalServices = bestServices.length ? bestServices : (services || []).slice(0, maxServices)

  const parts = []
  parts.push("--- RELEVANT CATALOG ---")

  if (finalProducts.length) {
    parts.push(
      "PRODUCTS (" + finalProducts.length + "):\n" +
      finalProducts.map((p) => {
        const desc  = truncateForPrompt((p?.description || "").trim() || "No description.", OLLAMA_CATALOG_DESC_MAX)
        const price = `${p?.price} ${p?.currency || "SAR"}`
        const stock = p?.stock != null ? ` Stock: ${p.stock}.` : ""
        return `• ${p?.name} — ${price}.${stock} ${desc}`
      }).join("\n")
    )
  }

  if (finalServices.length) {
    parts.push(
      "SERVICES (" + finalServices.length + "):\n" +
      finalServices.map((s) => {
        const desc  = truncateForPrompt((s?.description || "").trim() || "No description.", OLLAMA_CATALOG_DESC_MAX)
        const price = `${s?.price} ${s?.currency || "SAR"}`
        return `• ${s?.name} (${s?.category || "General"}) — ${price}. ${desc}`
      }).join("\n")
    )
  }

  parts.push("--- END CATALOG ---")
  return parts.join("\n\n")
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT SELECTION
// ─────────────────────────────────────────────────────────────────────────────

function getSystemInstructionForChat(customerLanguage) {
  const arOverride = String(process.env.OLLAMA_SYSTEM_INSTRUCTION_AR || "").trim()
  const enOverride = String(process.env.OLLAMA_SYSTEM_INSTRUCTION_EN || "").trim()

  if (customerLanguage === "ar") {
    return arOverride || GULF_SYSTEM_AR
  }
  return enOverride || GULF_SYSTEM_EN
}

// ─────────────────────────────────────────────────────────────────────────────
// OLLAMA — GENERATE REPLY
// ─────────────────────────────────────────────────────────────────────────────

async function generateReplyWithOllama(incomingBody, messageType, catalog, meta = {}) {
  const remoteJid    = String(meta.remoteJid || "").trim()
  const customerLang = meta.customerLanguage === "ar" ? "ar" : "en"
  const isArabic     = customerLang === "ar"

  const pureGreeting = isPureGreetingMessage(incomingBody)

  // Build catalog section — only inject when relevant and non-empty
  let catalogSection = ""
  if (!pureGreeting && messageType === "text" && incomingBody && incomingBody !== "[Voice note]") {
    const ctx = buildRelevantCatalogContext(catalog, incomingBody)
    // Only inject if we actually have something — never inject empty catalog
    if (ctx && ctx.trim()) {
      catalogSection = `\n\nWhat you currently have in stock:\n${ctx}`
    }
  }

  // Check if catalog has anything at all
  const catalogIsEmpty =
    !catalog ||
    ((!catalog.products || catalog.products.length === 0) &&
     (!catalog.services || catalog.services.length === 0))

  // Build user turn
  let userTurn = ""

  if (messageType === "text" && incomingBody && incomingBody !== "[Voice note]") {
    userTurn = `Customer message: "${incomingBody}"${catalogSection}`
  } else if (messageType === "audio" || incomingBody === "[Voice note]") {
    userTurn = `The customer sent a voice note. Acknowledge warmly in 1-2 lines and invite them to share what they need.`
  } else {
    userTurn = `The customer sent a ${messageType}. Acknowledge in 1-2 lines and offer to help.`
  }

  // Handling rules based on catalog state
  const catalogHandlingRule = catalogIsEmpty
    ? `\n\n[CATALOG RULE] You do not have a product list loaded right now. If they ask about products or prices, say something natural like "let me check on that for you" or "send me what you're looking for and I'll sort you out" — do NOT say "I don't have products in my catalog" or any robotic phrase like that. Keep it warm and human.`
    : `\n\n[CATALOG RULE] Only mention products that are listed above. If they ask about something not in the list, say naturally "let me check if we have that" or "I'll look into that for you" — never say "that product is not in my catalog".`

  userTurn += catalogHandlingRule

  // Language enforcement
  const langRule = isArabic
    ? `\n\n[LANGUAGE RULE — MANDATORY] كل ردك لازم يكون بالعامية الخليجية الطبيعية. مو فصحى. مو أردي. مو إنجليزي. خليجي عامي فقط — زي رسايل الواتساب الحقيقية.`
    : `\n\n[LANGUAGE RULE — MANDATORY] Reply in casual English only. No Urdu. No Hindi. No Arabic except "wa alaykum assalam" for salam greetings.`

  userTurn += langRule

  const humanStyleNudge = isArabic
    ? `\n\n[أسلوب الرد] اكتب رد قصير وعفوي على الواتساب، مو رد روبوت ولا فقرة منظمة.`
    : `\n\n[REPLY STYLE] Short informal WhatsApp text only — thumb-typed vibe, not polished AI English.`

  userTurn += humanStyleNudge

  // Build messages
  const systemPrompt = getSystemInstructionForChat(customerLang)
  const messages     = [{ role: "system", content: systemPrompt }]

  if (OLLAMA_CHAT_HISTORY_MAX > 0 && remoteJid) {
    const hist = ollamaChatHistories.get(remoteJid) || []
    messages.push(...hist.slice(-OLLAMA_CHAT_HISTORY_MAX))
  }

  messages.push({ role: "user", content: userTurn })

  const primaryModel  = isArabic && OLLAMA_MODEL_ARABIC ? OLLAMA_MODEL_ARABIC : OLLAMA_MODEL
  const fallbackModel = isArabic && primaryModel !== OLLAMA_MODEL ? OLLAMA_MODEL : null

  const ollamaTimeoutMs = Math.min(
    Math.max(Number(process.env.OLLAMA_FETCH_TIMEOUT_MS) || 180000, 45000),
    900000
  )

  const greetCap = Math.min(Math.max(Number(process.env.OLLAMA_GREETING_NUM_PREDICT) || 64, 32), 120)
  const numPredict = pureGreeting ? greetCap : OLLAMA_NUM_PREDICT

  const callOllama = async (modelName) => {
    if (!modelName) return null

    const options = {
      temperature:    OLLAMA_TEMPERATURE,
      num_predict:    numPredict,
      repeat_penalty: 1.12,
      top_p:          0.92,
      top_k:          50,
    }
    if (OLLAMA_NUM_CTX != null) options.num_ctx = OLLAMA_NUM_CTX

    const payload = {
      model:   modelName,
      messages,
      options,
      stream: false,
    }

    const controller = new AbortController()
    const timer      = setTimeout(() => controller.abort(), ollamaTimeoutMs)

    let res
    try {
      res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
        signal:  controller.signal,
      })
    } catch (err) {
      clearTimeout(timer)
      console.warn("Ollama fetch failed:", {
        model:   modelName,
        aborted: err?.name === "AbortError",
        message: err?.message,
      })
      return null
    }
    clearTimeout(timer)

    if (!res.ok) {
      const txt = await res.text().catch(() => "")
      console.warn("Ollama error response:", { model: modelName, status: res.status, body: txt.slice(0, 300) })
      return null
    }

    const data = await res.json().catch(() => ({}))

    let raw = ""
    const mc = data?.message?.content
    if (typeof mc === "string") {
      raw = mc
    } else if (Array.isArray(mc)) {
      raw = mc.map((p) => (typeof p === "string" ? p : p?.text || p?.content || "")).join("")
    } else {
      raw = data?.response || data?.output_text || data?.choices?.[0]?.message?.content || ""
    }

    const cleaned = cleanReplyText(raw)

    if (!cleaned) {
      console.warn("Ollama empty reply after cleaning:", { model: modelName })
      return null
    }

    console.log(`[Ollama] model=${modelName} lang=${customerLang} greeting=${pureGreeting} preview="${cleaned.slice(0, 80)}"`)
    return cleaned
  }

  let reply = await callOllama(primaryModel)
  if (!reply && fallbackModel) {
    console.log(`[Ollama] Primary (${primaryModel}) failed — trying fallback (${fallbackModel})`)
    reply = await callOllama(fallbackModel)
  }

  if (reply && OLLAMA_CHAT_HISTORY_MAX > 0 && remoteJid) {
    const shortUser =
      messageType === "text" && incomingBody !== "[Voice note]"
        ? String(incomingBody || "").trim().slice(0, 500)
        : `[${messageType}]`

    let h = ollamaChatHistories.get(remoteJid) || []
    h.push({ role: "user",      content: shortUser })
    h.push({ role: "assistant", content: reply.slice(0, 1000) })
    if (h.length > OLLAMA_CHAT_HISTORY_MAX) h = h.slice(-OLLAMA_CHAT_HISTORY_MAX)
    ollamaChatHistories.set(remoteJid, h)
  }

  return reply || null
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE EXTRACTION / PARSING
// ─────────────────────────────────────────────────────────────────────────────

function extractMessageId(m) {
  return String(m?.key?.id || m?.id || "").trim()
}

function messageTimestampToSeconds(m) {
  const t = Number(m?.messageTimestamp) || 0
  if (!t) return 0
  return t > 1e12 ? Math.floor(t / 1000) : Math.floor(t)
}

function getUnreadCount(chat) {
  const raw =
    chat?.unreadCount ??
    chat?.unreadMessages ??
    chat?.unread ??
    chat?.unread_count ??
    chat?.countUnread ??
    chat?.conversationTimestampUnreadCount ??
    chat?.conversation?.unreadCount ??
    chat?.conversation?.unreadMessages
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function hasUnreadCountField(chat) {
  if (!chat || typeof chat !== "object") return false
  const conv = chat.conversation && typeof chat.conversation === "object" ? chat.conversation : null
  return (
    Object.prototype.hasOwnProperty.call(chat, "unreadCount") ||
    Object.prototype.hasOwnProperty.call(chat, "unreadMessages") ||
    Object.prototype.hasOwnProperty.call(chat, "unread") ||
    Object.prototype.hasOwnProperty.call(chat, "unread_count") ||
    Object.prototype.hasOwnProperty.call(chat, "countUnread") ||
    Object.prototype.hasOwnProperty.call(chat, "conversationTimestampUnreadCount") ||
    (conv &&
      (Object.prototype.hasOwnProperty.call(conv, "unreadCount") ||
        Object.prototype.hasOwnProperty.call(conv, "unreadMessages")))
  )
}

function isUnreadInboundMessage(m) {
  if (!m || m?.key?.fromMe) return false
  const status     = String(m?.status || m?.messageStatus || m?.ack || "").toLowerCase()
  const explicitRead =
    m?.read === true ||
    m?.isRead === true ||
    status === "read" ||
    status === "seen" ||
    status === "played"
  return !explicitRead
}

function isStatusChatRemoteJid(remoteJidOrId) {
  const jid = String(remoteJidOrId || "").trim().toLowerCase()
  if (!jid) return false
  return jid.includes("status@broadcast") || (jid.startsWith("status@") && jid.includes("@broadcast"))
}

function normalizeWebhookEventName(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, ".")
}

function isMessagesUpsertEvent(eventRaw) {
  const e = normalizeWebhookEventName(eventRaw)
  return e === "messages.upsert"
}

function normalizeWebhookMessages(data) {
  if (!data) return []
  if (Array.isArray(data)) return data.filter(Boolean)
  if (Array.isArray(data.messages)) return data.messages.filter(Boolean)
  if (data.key && (data.message !== undefined || data.messageTimestamp)) return [data]
  return []
}

function unwrapMessageContent(message) {
  let msg = message || {}
  if (typeof msg === "string") {
    try { msg = JSON.parse(msg) } catch { return {} }
  }
  if (msg?.ephemeralMessage?.message)     msg = msg.ephemeralMessage.message
  if (msg?.viewOnceMessageV2?.message)    msg = msg.viewOnceMessageV2.message
  if (msg?.viewOnceMessage?.message)      msg = msg.viewOnceMessage.message
  return msg
}

function evolutionRowLooksLikeInboundVoiceNote(m) {
  const msg = unwrapMessageContent(m?.message)
  if (msg?.audioMessage || msg?.pttMessage || msg?.voiceMessage) return true
  const mt = String(m?.messageType || "").toLowerCase().replace(/_/g, "")
  return mt.includes("ptt") || mt.includes("voicenote") || mt.includes("audiomessage") || mt === "audio"
}

function extractIncomingTextFromEvolutionMessage(m) {
  const msg = unwrapMessageContent(m?.message)

  if (msg?.conversation)                return { text: String(msg.conversation), messageType: "text" }
  if (msg?.extendedTextMessage?.text)   return { text: String(msg.extendedTextMessage.text), messageType: "text" }
  if (msg?.imageMessage)                return { text: (msg.imageMessage.caption || "").trim() || "[Image]", messageType: "image" }
  if (msg?.videoMessage)                return { text: (msg.videoMessage.caption || "").trim() || "[Video]", messageType: "video" }
  if (msg?.documentMessage) {
    return {
      text: (msg.documentMessage.caption || msg.documentMessage.fileName || msg.documentMessage.filename || "").trim() || "[Document]",
      messageType: "document",
    }
  }
  if (msg?.audioMessage || msg?.pttMessage) return { text: "[Voice note]", messageType: "audio" }
  if (msg?.voiceMessage)                    return { text: "[Voice note]", messageType: "audio" }
  if (msg?.stickerMessage)                  return { text: "[Sticker]",    messageType: "sticker" }

  const dbType = String(m?.messageType || "").toLowerCase().replace(/_/g, "")
  if (dbType.includes("ptt") || dbType.includes("voicenote") || dbType === "audiomessage" || dbType.includes("audiomessage")) {
    return { text: "[Voice note]", messageType: "audio" }
  }
  return { text: "", messageType: String(m?.messageType || "text") }
}

// ─────────────────────────────────────────────────────────────────────────────
// INBOUND PROCESSING
// ─────────────────────────────────────────────────────────────────────────────

function buildMessageSignature(remoteJid, tsSec, messageId, text) {
  const base   = String(remoteJid || "").trim()
  const tNum   = Number(tsSec) || 0
  const isMs   = tNum > 1e12
  const tMs    = isMs ? tNum : tNum * 1000
  const bucket = Math.floor(tMs / SIGNATURE_BUCKET_MS)
  const mid    = String(messageId || "").trim()
  const norm   = String(text || "").trim().replace(/\s+/g, " ").toLowerCase().slice(0, 80)
  return mid ? `${base}|${bucket}|${mid}|${norm}` : `${base}|${bucket}|${norm}`
}

function buildInboundReadReceipt(m, remoteJid) {
  const jid = String(remoteJid || m?.key?.remoteJid || "").trim()
  const id  = extractMessageId(m)
  if (!jid || !id) return null
  return { remoteJid: jid, fromMe: false, id }
}

async function processInboundEvolutionMessage(instanceName, m, { fromWebhook = false } = {}) {
  const userId = extractUserIdFromInstanceName(instanceName)
  if (!userId) {
    console.warn("Evolution auto-reply: skip message, instance name not user_*", { instanceName })
    return
  }
  if (!m?.key || m.key.fromMe) return

  const remoteJid = String(m.key.remoteJid || "").trim()
  if (!remoteJid || isStatusChatRemoteJid(remoteJid)) return
  if (remoteJid.includes("@g.us")) return

  if (!fromWebhook && POLL_ONLY_UNREAD_MESSAGES && !isUnreadInboundMessage(m)) return

  let tsSec = messageTimestampToSeconds(m)
  if (!tsSec && fromWebhook) tsSec = Math.floor(Date.now() / 1000)
  if (!tsSec) return

  let { text, messageType } = extractIncomingTextFromEvolutionMessage(m)
  if (evolutionRowLooksLikeInboundVoiceNote(m)) {
    messageType = "audio"
    if (!text || text.trim() === "") text = "[Voice note]"
  }

  const originalWasAudio = messageType === "audio"
  let sttLanguage        = null

  if (!text && messageType === "text") return

  const messageId   = extractMessageId(m)
  const receivedAt  = tsSec * 1000
  const signature   = buildMessageSignature(remoteJid, tsSec, messageId, text)
  const prevSeenAt  = enqueuedMessageSignatures.get(signature)

  if (typeof prevSeenAt === "number" && receivedAt - prevSeenAt < SEEN_SIGNATURE_TTL_MS) return
  enqueuedMessageSignatures.set(signature, receivedAt)

  const prevTsSec = lastProcessedByRemoteJid.get(remoteJid) || 0
  // Strict `<` so a message at the priming watermark (same ts) can still be processed once.
  // Duplicate polls for the same message are blocked by buildMessageSignature + SEEN_SIGNATURE_TTL_MS above.
  if (tsSec < prevTsSec) return
  lastProcessedByRemoteJid.set(remoteJid, tsSec)

  // STT — transcribe voice notes
  if (originalWasAudio && voice.isVoiceReplyEnabled() && voice.canTranscribe()) {
    const stt = await voice.transcribeEvolutionVoiceNote(evolutionClient, instanceName, m)
    if (stt?.text) {
      text        = stt.text
      sttLanguage = stt.language || null
      console.log(`[STT] Transcribed: lang=${sttLanguage} text="${text.slice(0, 80)}"`)
    } else if (originalWasAudio) {
      console.warn(
        "Evolution auto-reply: voice note not transcribed. Enable DATABASE_SAVE_DATA_NEW_MESSAGE on Evolution or use EVOLUTION_AUTO_REPLY_TRANSPORT=webhook.",
        { instanceName, remoteJid, messageId: messageId || undefined }
      )
    }
  }

  const effectiveMessageType =
    originalWasAudio && text && text !== "[Voice note]" ? "text" : messageType

  // Language detection — Whisper result is most accurate for voice
  // For text: use detectLanguage which checks Arabic Unicode chars
  const customerLanguage =
    sttLanguage === "ar" || sttLanguage === "en"
      ? sttLanguage
      : detectLanguage(text || "")

  // Voice reply: allow when inbound was audio even if STT failed (text still "[Voice note]") — we TTS Ollama's reply text.
  const replyAsVoice =
    Boolean(text) &&
    (text !== "[Voice note]" || originalWasAudio) &&
    voice.isVoiceReplyEnabled() &&
    voice.canSynthesize() &&
    (originalWasAudio || EVOLUTION_VOICE_REPLY_ALWAYS)

  const item = {
    userId,
    instanceName,
    to:           remoteJid,
    body:         text || "",
    messageType:  effectiveMessageType || messageType || "text",
    originalWasAudio,
    receivedAt,
    readReceipt:  buildInboundReadReceipt(m, remoteJid),
    replyAsVoice,
    customerLanguage,
  }

  const source = fromWebhook ? "webhook" : "poll"
  console.log(`Evolution auto-reply: inbound (${source})`, {
    instanceName,
    remoteJid,
    receivedAt:       new Date(receivedAt).toISOString(),
    messageSnippet:   (text || "").slice(0, 80),
    customerLanguage,
    rawMessageType:   m?.messageType,
    originalWasAudio,
    replyAsVoice,
  })

  try {
    await WhatsappMessage.create({
      userId,
      provider:    "evolution",
      direction:   "inbound",
      from:        String(m?.key?.participant || remoteJid),
      to:          remoteJid,
      messageType: String(m?.messageType || messageType || "text"),
      body:        text || "",
      createdAt:   new Date(receivedAt),
    })
  } catch (_) {}

  try {
    await processOne(item)
  } catch (err) {
    console.error("Evolution Ollama auto-reply process error:", err?.message || err)
  }

  await sleep(DELAY_BETWEEN_REPLIES_MS)
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESS ONE — generate + send reply
// ─────────────────────────────────────────────────────────────────────────────

async function processOne(item) {
  const itemTsMs  = item.receivedAt ? new Date(item.receivedAt).getTime() : Date.now()
  const tKey      = throttleKeyForItem(item)
  const lastTsMs  = lastSentTo.get(tKey)

  if (typeof lastTsMs === "number" && itemTsMs - lastTsMs < DEDUPE_WINDOW_MS) {
    console.log("Evolution auto-reply: throttled", {
      to:           item.to,
      windowMs:     DEDUPE_WINDOW_MS,
      lastSentAtMs: new Date(lastTsMs).toISOString(),
    })
    return
  }

  const catalog          = await getCatalogForUser(item.userId)
  const customerLanguage =
    item.customerLanguage === "ar" || item.customerLanguage === "en"
      ? item.customerLanguage
      : detectLanguage(item.body || "")

  const replyText = await generateReplyWithOllama(
    item.body,
    item.messageType,
    catalog,
    { remoteJid: item.to, customerLanguage }
  )

  if (!replyText) {
    console.warn("Evolution Ollama auto-reply: no reply generated (Ollama empty/error).", {
      instanceName: item.instanceName,
      to:           item.to,
      ollamaUrl:    OLLAMA_URL,
    })
    return
  }

  const generatedAt = new Date().toISOString()
  console.log("Evolution Ollama auto-reply: reply generated", {
    instanceName: item.instanceName,
    to:           item.to,
    generatedAt,
    customerLanguage,
    preview:      replyText.slice(0, 80),
    replyAsVoice: item.replyAsVoice,
  })

  let sendResp   = null
  let sentAsVoice = false
  const sendNumber = evolutionRecipientNumber(item.to)
  const sentAt     = new Date().toISOString()

  // ── Voice reply ──────────────────────────────────────────────────────────
  if (item.replyAsVoice) {
    const replyVoiceLang = customerLanguage === "ar" ? "ar" : "en"
    const audioB64       = await voice.synthesizeSpeechToMp3Base64(replyText, {
      replyLanguage: replyVoiceLang,
      preferOllamaForInboundVoice: item.originalWasAudio === true,
    })

    if (!audioB64) {
      console.warn("Evolution Ollama auto-reply: TTS returned no audio — sending text only.")
    }

    if (audioB64) {
      try {
        const audioPayload = voice.audioMp3Base64ForEvolutionSend(audioB64)
        const useEncoding  = voice.whatsAppAudioEncodingDefaultOn()

        console.log("Evolution Ollama auto-reply: sending voice reply", {
          instanceName: item.instanceName,
          to:           item.to,
          sendNumber,
          sentAt,
          preview:      replyText.slice(0, 80),
          encoding:     useEncoding,
        })

        sendResp = await voice.evolutionPostMediaWithRetry(
          evolutionClient,
          `/message/sendWhatsAppAudio/${encodeURIComponent(item.instanceName)}`,
          {
            number: sendNumber,
            audio:  audioPayload,
            ...(useEncoding ? { encoding: true } : {}),
          }
        )
        sentAsVoice = true
        console.log("Evolution Ollama auto-reply: voice sent OK", {
          instanceName: item.instanceName,
          to:           item.to,
        })
      } catch (err) {
        console.error("Evolution Ollama auto-reply: sendWhatsAppAudio failed", {
          instanceName: item.instanceName,
          to:           item.to,
          status:       err?.response?.status,
          details:      err?.response?.data || err?.message,
        })
        sentAsVoice = false
      }
    }
  }

  // ── Text reply (always sent if voice failed or voice+text mode) ──────────
  const alsoSendText = voice.sendTextWithVoiceAlso()
  const needText     = !sentAsVoice || alsoSendText

  if (needText) {
    try {
      console.log("Evolution Ollama auto-reply: sending text reply", {
        instanceName: item.instanceName,
        to:           item.to,
        sendNumber,
        sentAt,
        preview:      replyText.slice(0, 80),
        mode:         sentAsVoice && alsoSendText ? "text_after_voice" : "text",
      })

      sendResp = await evolutionClient.post(
        `/message/sendText/${encodeURIComponent(item.instanceName)}`,
        { number: sendNumber, text: replyText }
      )
    } catch (err) {
      console.error("Evolution Ollama auto-reply: sendText failed", {
        instanceName: item.instanceName,
        to:           item.to,
        status:       err?.response?.status,
        details:      err?.response?.data || err?.message,
      })
      if (!sentAsVoice) throw err
    }
  }

  lastSentTo.set(tKey, itemTsMs)

  await WhatsappMessage.create({
    userId:      item.userId,
    provider:    "evolution",
    direction:   "outbound",
    from:        "evolution",
    to:          item.to,
    messageType: sentAsVoice && !alsoSendText ? "audio" : "text",
    body:        replyText,
    createdAt:   new Date(),
  })

  console.log("Evolution Ollama auto-reply: reply sent", {
    instanceName: item.instanceName,
    to:           item.to,
    sentAt:       new Date().toISOString(),
    receivedAt:   item.receivedAt ? new Date(item.receivedAt).toISOString() : undefined,
  })

  if (item.readReceipt?.id && item.readReceipt?.remoteJid) {
    await evolutionMarkMessagesAsRead(item.instanceName, [item.readReceipt])
  }

  return sendResp?.data
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK AS READ
// ─────────────────────────────────────────────────────────────────────────────

async function evolutionMarkMessagesAsRead(instanceName, readMessages) {
  if (!MARK_MESSAGE_READ || !readMessages?.length) return
  const name = String(instanceName || "").trim()
  if (!name) return
  try {
    await evolutionClient.post(
      `/chat/markMessageAsRead/${encodeURIComponent(name)}`,
      { readMessages }
    )
    console.log("Evolution auto-reply: marked as read", { instanceName: name, count: readMessages.length })
  } catch (err) {
    console.warn("Evolution auto-reply: markMessageAsRead failed", {
      instanceName: name,
      status:       err?.response?.status,
      details:      err?.response?.data || err?.message,
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK
// ─────────────────────────────────────────────────────────────────────────────

async function handleEvolutionWebhookPayload(body) {
  if (!body || typeof body !== "object") return
  if (!isMessagesUpsertEvent(body.event)) return

  const instanceName = String(body.instance || body.instanceName || "").trim()
  if (!instanceName) {
    console.warn("Evolution webhook: missing instance name")
    return
  }

  const messages = normalizeWebhookMessages(body.data)
  if (!messages.length) {
    console.warn("Evolution webhook: messages.upsert with no messages", { instanceName })
    return
  }

  for (const m of messages) {
    await processInboundEvolutionMessage(instanceName, m, { fromWebhook: true })
  }
}

function registerWebhookRoutes(app) {
  const paths   = ["/api/webhooks/evolution", "/api/webhooks/evolution/messages-upsert"]
  const handler = async (req, res) => {
    const secret = String(process.env.EVOLUTION_WEBHOOK_SECRET || "").trim()
    if (secret) {
      const hdr   = String(req.get("x-webhook-secret") || req.get("x-evolution-token") || req.get("authorization") || "").trim()
      const token = hdr.startsWith("Bearer ") ? hdr.slice(7).trim() : hdr
      if (token !== secret) return res.status(401).json({ ok: false, message: "Invalid webhook secret" })
    }

    if (String(process.env.EVOLUTION_WEBHOOK_VERIFY_APIKEY || "").trim().toLowerCase() === "true") {
      const k = String(req.body?.apikey || "").trim()
      if (!process.env.EVOLUTION_KEY || k !== String(process.env.EVOLUTION_KEY).trim()) {
        return res.status(401).json({ ok: false, message: "Invalid api key" })
      }
    }

    res.status(200).json({ ok: true })

    try {
      await handleEvolutionWebhookPayload(req.body)
    } catch (err) {
      console.error("Evolution webhook handler error:", err?.message || err)
    }
  }

  for (const p of paths) {
    app.post(p, handler)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POLL
// ─────────────────────────────────────────────────────────────────────────────

async function pollOnce(ownerUserId) {
  const instanceName = getInstanceName(ownerUserId)

  const conn = await getInstanceConnectionState(instanceName)
  if (!conn.ok) {
    if (conn.notFound) {
      console.warn("Evolution auto-reply: instance not found", { instanceName })
      return
    }
    console.warn("Evolution auto-reply: connectionState failed", {
      instanceName,
      status:  conn.err?.response?.status,
      details: conn.err?.response?.data || conn.err?.message,
    })
    throw conn.err
  }

  const state =
    conn?.data?.instance?.state ??
    conn?.data?.state ??
    conn?.data?.data?.instance?.state ??
    conn?.data?.data?.state

  console.log("Evolution auto-reply: connectionState", { instanceName, state })
  if (!state) return

  const stateStr = String(state).toLowerCase()
  if (stateStr === "close" || stateStr === "disconnected" || stateStr === "closed") return

  // Fetch chats
  let chatsResp
  try {
    chatsResp = await voice.evolutionPostMediaWithRetry(
      evolutionClient,
      `/chat/findChats/${encodeURIComponent(instanceName)}`,
      { limit: CHATS_LIMIT }
    )
  } catch (err) {
    console.error("Evolution auto-reply: findChats failed", {
      status:   err?.response?.status,
      details:  err?.response?.data || err?.message,
    })
    throw err
  }

  const chatsData = chatsResp?.data
  const chats = Array.isArray(chatsData)
    ? chatsData
    : Array.isArray(chatsData?.chats)
      ? chatsData.chats
      : Array.isArray(chatsData?.records)
        ? chatsData.records
        : Array.isArray(chatsData?.data)
          ? chatsData.data
          : []

  const baseFiltered = chats.filter((chat) => {
    const jid = String(chat?.remoteJid || chat?.id || "").trim()
    if (!jid) return false
    if (isStatusChatRemoteJid(jid)) return false
    if (jid.includes("@g.us")) return false
    return true
  })

  let filteredChats = baseFiltered
  if (POLL_ONLY_CHATS_WITH_UNREAD) {
    filteredChats = baseFiltered.filter((chat) => {
      if (!hasUnreadCountField(chat)) return false
      return getUnreadCount(chat) > 0
    })
    if (!filteredChats.length && baseFiltered.length) {
      console.log("Evolution auto-reply: poll skipped — no chats with unread metadata", { instanceName })
    }
  } else if (REQUIRE_UNREAD_CHAT_COUNT) {
    filteredChats = baseFiltered.filter((chat) => {
      const chatHasUnreadField = hasUnreadCountField(chat)
      if (chatHasUnreadField && getUnreadCount(chat) <= 0) return false
      return true
    })
  }

  filteredChats = filteredChats.slice(0, CHATS_LIMIT)
  console.log("Evolution auto-reply: chats", {
    instanceName,
    total:    chats.length,
    filtered: filteredChats.length,
  })

  for (const chat of filteredChats) {
    const remoteJid = String(chat?.remoteJid || chat?.id || "").trim()
    if (!remoteJid) continue
    if (isStatusChatRemoteJid(remoteJid)) continue

    const hadWatermark = lastProcessedByRemoteJid.has(remoteJid)

    let messagesResp
    try {
      messagesResp = await voice.evolutionPostMediaWithRetry(
        evolutionClient,
        `/chat/findMessages/${encodeURIComponent(instanceName)}`,
        { where: { key: { remoteJid } }, limit: MESSAGES_PER_CHAT }
      )
    } catch (err) {
      console.error("Evolution auto-reply: findMessages failed", {
        remoteJid,
        status:  err?.response?.status,
        details: err?.response?.data || err?.message,
      })
      continue
    }

    const messagesData = messagesResp?.data
    const records = Array.isArray(messagesData)
      ? messagesData
      : Array.isArray(messagesData?.messages?.records)
        ? messagesData.messages.records
        : Array.isArray(messagesData?.messages)
          ? messagesData.messages
          : Array.isArray(messagesData?.records)
            ? messagesData.records
            : Array.isArray(messagesData?.data)
              ? messagesData.data
              : []

    console.log("Evolution auto-reply: messages found", {
      instanceName,
      remoteJid,
      count: records.length,
    })

    const sorted = [...records].sort(
      (a, b) => messageTimestampToSeconds(a) - messageTimestampToSeconds(b)
    )

    // Prime watermark on first sight to avoid replying to old backlog
    if (!hadWatermark && sorted.length) {
      const newest       = sorted[sorted.length - 1]
      const newestTs     = messageTimestampToSeconds(newest)
      const newestInbound = Boolean(newest?.key && !newest.key.fromMe)
      const ageMs         = newestTs ? Date.now() - newestTs * 1000 : Number.POSITIVE_INFINITY
      const treatAsLive   = newestInbound && ageMs >= 0 && ageMs <= PRIME_RECENT_INBOUND_MS

      let primeTs = newestTs
      if (treatAsLive && sorted.length >= 2) {
        primeTs = messageTimestampToSeconds(sorted[sorted.length - 2])
      } else if (treatAsLive) {
        primeTs = 0
      }
      lastProcessedByRemoteJid.set(remoteJid, Math.max(0, primeTs))
      continue
    }

    for (const m of sorted) {
      await processInboundEvolutionMessage(instanceName, m, { fromWebhook: false })
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────────────────────

async function start() {
  if (!process.env.EVOLUTION_KEY) {
    console.warn("Evolution auto-reply: EVOLUTION_KEY is required; worker not started.")
    return
  }

  console.log("Evolution auto-reply: starting", {
    evolutionAxiosTimeoutMs: EVOLUTION_AXIOS_TIMEOUT_MS,
    provider:                "ollama",
    model:                   OLLAMA_MODEL,
    modelArabic:             OLLAMA_MODEL_ARABIC,
    endpoint:                `${OLLAMA_URL}/api/chat`,
    gulfShopMode:            EVOLUTION_GULF_SHOP_MODE,
    ollamaChatHistoryMax:    OLLAMA_CHAT_HISTORY_MAX,
    ollamaNumCtx:            OLLAMA_NUM_CTX,
    ollamaCatalogDescMax:    OLLAMA_CATALOG_DESC_MAX,
    ollamaCatalogMaxItems:   { products: OLLAMA_CATALOG_MAX_PRODUCTS, services: OLLAMA_CATALOG_MAX_SERVICES },
    replyDelayMs:            DELAY_BETWEEN_REPLIES_MS,
    pollIntervalMs:          POLL_INTERVAL_MS,
    temperature:             OLLAMA_TEMPERATURE,
    numPredict:              OLLAMA_NUM_PREDICT,
    voiceReply:              voice.isVoiceReplyEnabled(),
    voiceReplyAlways:        EVOLUTION_VOICE_REPLY_ALWAYS,
    voiceStt:                voice.isVoiceReplyEnabled() && voice.canTranscribe(),
    voiceSttProvider:        String(process.env.VOICE_STT_PROVIDER || "auto"),
    fasterWhisperReady:      canRunFasterWhisperStt(),
    whisperFasterModel:      getFasterWhisperModel(),
    nodeWhisperReady:        canRunNodeStt(),
    whisperNodeModel:        getWhisperModelId(),
    voiceTts:                voice.isVoiceReplyEnabled() && voice.canSynthesize(),
  })

  const resolveOwnerUserId = async () => {
    const envId = String(process.env.EVOLUTION_AUTO_REPLY_USER_ID || "").trim()
    if (envId) return envId
    const fromInstances = await pickOwnerUserIdFromInstances()
    if (fromInstances) return fromInstances
    return getOwnerUserId()
  }

  let ownerUserId = await resolveOwnerUserId()
  if (!ownerUserId || !String(ownerUserId).trim()) {
    console.warn("Evolution auto-reply: no owner user found in DB; worker not started.")
    return
  }

  const instanceName = getInstanceName(ownerUserId)
  const transport    = EVOLUTION_AUTO_REPLY_TRANSPORT
  const useHttpPoll  = transport !== "webhook"

  console.log("Evolution auto-reply: started", {
    ownerUserId,
    instanceName,
    transport,
    pollMs:                   useHttpPoll ? POLL_INTERVAL_MS : null,
    pollOnlyChatsWithUnread:  POLL_ONLY_CHATS_WITH_UNREAD,
    primeRecentInboundMs:     PRIME_RECENT_INBOUND_MS,
    pollOnlyUnreadMessages:   POLL_ONLY_UNREAD_MESSAGES,
    webhookPaths:             ["/api/webhooks/evolution", "/api/webhooks/evolution/messages-upsert"],
  })

  if (useHttpPoll) {
    try {
      await pollOnce(ownerUserId)
    } catch (err) {
      console.error("Evolution auto-reply initial poll error:", err?.message || err)
    }

    setInterval(async () => {
      try {
        ownerUserId = await resolveOwnerUserId()
        if (!ownerUserId) return
        await pollOnce(ownerUserId)
      } catch (err) {
        console.error("Evolution auto-reply poll error:", {
          status:  err?.response?.status,
          details: err?.response?.data || err?.message,
        })
      }
    }, POLL_INTERVAL_MS)
  }
}

module.exports = { start, registerWebhookRoutes }