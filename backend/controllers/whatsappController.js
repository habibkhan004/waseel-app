const User = require("../models/User")
const WhatsappMessage = require("../models/WhatsappMessage")

function getWhapiConfig() {
  const baseUrl = (process.env.WHAPI_BASE_URL || "https://gate.whapi.cloud").replace(/\/$/, "")
  const token = process.env.WHAPI_TOKEN
  return { baseUrl, token }
}

function normalizeWhapiTo(to) {
  // Whapi expects plain digits (international format) or chat_id like 1203...@g.us
  const raw = String(to || "").trim()
  if (!raw) return ""
  if (raw.includes("@")) return raw
  if (raw.startsWith("whatsapp:")) return raw.replace(/^whatsapp:\+?/, "").replace(/[^\d]/g, "")
  return raw.replace(/^\+/, "").replace(/[^\d]/g, "")
}

async function whapiPost(path, payload) {
  const { baseUrl, token } = getWhapiConfig()
  if (!token) {
    const err = new Error("WHAPI_TOKEN is missing in backend .env")
    err.status = 500
    throw err
  }
  if (typeof fetch !== "function") {
    const err = new Error("This Node.js version does not support fetch(). Upgrade Node to 18+ or add a fetch polyfill.")
    err.status = 500
    throw err
  }

  const url = `${baseUrl}${path}`
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload || {}),
  })

  const text = await resp.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch (_) {
    data = { raw: text }
  }

  if (!resp.ok) {
    const err = new Error(data?.message || data?.error || `Whapi request failed (${resp.status})`)
    err.status = resp.status
    err.data = data
    throw err
  }
  return data
}

async function whapiGet(path) {
  const { baseUrl, token } = getWhapiConfig()
  if (!token) {
    const err = new Error("WHAPI_TOKEN is missing in backend .env")
    err.status = 500
    throw err
  }
  if (typeof fetch !== "function") {
    const err = new Error("This Node.js version does not support fetch(). Upgrade Node to 18+ or add a fetch polyfill.")
    err.status = 500
    throw err
  }

  const url = `${baseUrl}${path}`
  const resp = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  })

  const text = await resp.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch (_) {
    data = { raw: text }
  }

  if (!resp.ok) {
    const err = new Error(data?.message || data?.error || `Whapi request failed (${resp.status})`)
    err.status = resp.status
    err.data = data
    throw err
  }
  return data
}

async function whapiGetMedia(mediaId) {
  const { baseUrl, token } = getWhapiConfig()
  if (!token) {
    const err = new Error("WHAPI_TOKEN is missing in backend .env")
    err.status = 500
    throw err
  }
  if (typeof fetch !== "function") {
    const err = new Error("This Node.js version does not support fetch(). Upgrade Node to 18+ or add a fetch polyfill.")
    err.status = 500
    throw err
  }

  const safeId = String(mediaId || "").trim()
  if (!safeId) {
    const err = new Error("mediaId is required")
    err.status = 400
    throw err
  }

  const url = `${baseUrl}/media/${encodeURIComponent(safeId)}`
  const resp = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "*/*" },
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => "")
    let data = null
    try {
      data = text ? JSON.parse(text) : null
    } catch (_) {
      data = { raw: text }
    }
    const err = new Error(data?.message || data?.error || `Whapi media request failed (${resp.status})`)
    err.status = resp.status
    err.data = data
    throw err
  }

  const contentType = resp.headers.get("content-type") || "application/octet-stream"
  const ab = await resp.arrayBuffer()
  return { contentType, buffer: Buffer.from(ab) }
}

function whapiMessageToUi(msg) {
  const messageType = String(msg?.type || "text")
  const createdAt = msg?.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date()
  const isOutbound = !!msg?.from_me

  let body = ""
  if (messageType === "text") body = String(msg?.text?.body || "")
  else if (messageType === "document") body = String(msg?.document?.caption || msg?.document?.file_name || msg?.document?.filename || "[document]")
  else if (messageType === "image") body = String(msg?.image?.caption || "[image]")
  else if (messageType === "video") body = String(msg?.video?.caption || "[video]")
  else if (messageType === "audio") body = "[audio]"
  else if (messageType === "voice") body = "[voice]"
  else body = `[${messageType}]`

  const media = msg?.document || msg?.image || msg?.video || msg?.audio || msg?.voice || msg?.sticker || null
  const mediaId = String(media?.id || "")
  const mediaMimeType = String(media?.mime_type || "")
  const mediaFileName = String(media?.file_name || media?.filename || "")
  const mediaLink = String(media?.link || "")

  // Align with existing frontend shape
  return {
    id: String(msg?.id || `${Date.now()}-${Math.random()}`),
    provider: "whapi",
    direction: isOutbound ? "outbound" : "inbound",
    from: isOutbound ? "me" : String(msg?.from || "").trim(),
    to: String(msg?.chat_id || "").trim(),
    messageType,
    mediaId,
    mediaMimeType,
    mediaFileName,
    mediaLink,
    body,
    createdAt,
  }
}

async function getWhapiMedia(req, res) {
  try {
    const mediaId = req.params?.mediaId
    const { contentType, buffer } = await whapiGetMedia(mediaId)
    res.setHeader("Content-Type", contentType)
    // Let browser cache briefly; voice notes are immutable per media id
    res.setHeader("Cache-Control", "private, max-age=300")
    return res.status(200).send(buffer)
  } catch (err) {
    const status = err?.status || 500
    console.error("Whapi media proxy error:", err?.data || err)
    return res.status(status >= 400 && status <= 599 ? status : 500).json({
      ok: false,
      message: err?.message || "Failed to fetch media from Whapi.",
      data: err?.data || null,
    })
  }
}

async function listWhapiChats(req, res) {
  try {
    const count = Math.min(Math.max(Number(req.query?.count) || 50, 1), 500)
    const offset = Math.max(Number(req.query?.offset) || 0, 0)

    const data = await whapiGet(`/chats?count=${encodeURIComponent(String(count))}&offset=${encodeURIComponent(String(offset))}`)
    const chats = Array.isArray(data?.chats) ? data.chats : []

    const out = chats.map((c) => {
      const last = c?.last_message
      const lastUi = last ? whapiMessageToUi(last) : null
      return {
        id: String(c?.id || ""),
        name: String(c?.name || c?.id || ""),
        type: String(c?.type || "unknown"),
        timestamp: Number(c?.timestamp || 0),
        unread: Number(c?.unread || 0),
        chatPic: c?.chat_pic || "",
        lastMessage: lastUi?.body || "",
        lastMessageAt: lastUi?.createdAt || (c?.timestamp ? new Date(Number(c.timestamp) * 1000) : null),
        lastMessageType: lastUi?.messageType || "",
      }
    })

    return res.json({ ok: true, chats: out })
  } catch (err) {
    const status = err?.status || 500
    console.error("Whapi list chats error:", err?.data || err)
    const code = err?.data?.code
    const msg = err?.data?.error || err?.message || "Failed to load chats from Whapi."
    const isTrialExceeded = code === 402 || /trial version limit exceeded/i.test(msg)
    return res.status(isTrialExceeded ? 402 : status >= 400 && status <= 599 ? status : 500).json({
      ok: false,
      code: isTrialExceeded ? 402 : code,
      message: isTrialExceeded ? "Whapi trial limit exceeded. Please upgrade your Whapi plan or wait for quota reset." : msg,
      data: err?.data || null,
    })
  }
}

/** Whapi author param must be 7–15 digits. Normalize chatId (e.g. 923...@s.whatsapp.net) to digits only. */
function authorFromChatId(chatId) {
  const digits = String(chatId || "").replace(/\D/g, "").slice(0, 15)
  return digits.length >= 7 && digits.length <= 15 ? digits : ""
}

async function listWhapiMessages(req, res) {
  try {
    const chatId = String(req.query?.chatId || "").trim()
    if (!chatId) return res.status(400).json({ ok: false, message: "chatId is required" })

    const author = authorFromChatId(chatId)
    if (!author) {
      return res.json({ ok: true, chatId, messages: [] })
    }

    const count = Math.min(Math.max(Number(req.query?.count) || 50, 1), 500)
    const data = await whapiGet(`/messages/list?count=${encodeURIComponent(String(count))}&author=${encodeURIComponent(author)}&sort=asc`)
    const msgs = Array.isArray(data?.messages) ? data.messages : []

    // Filter to this chat_id just in case.
    const filtered = msgs.filter((m) => String(m?.chat_id || "").includes(author) || String(m?.chat_id || "") === chatId).map(whapiMessageToUi)
    return res.json({ ok: true, chatId, messages: filtered })
  } catch (err) {
    const status = err?.status || 500
    console.error("Whapi list messages error:", err?.data || err)
    const code = err?.data?.code
    const msg = err?.data?.error || err?.message || "Failed to load messages from Whapi."
    const isTrialExceeded = code === 402 || /trial version limit exceeded/i.test(msg)
    return res.status(isTrialExceeded ? 402 : status >= 400 && status <= 599 ? status : 500).json({
      ok: false,
      code: isTrialExceeded ? 402 : code,
      message: isTrialExceeded ? "Whapi trial limit exceeded. Please upgrade your Whapi plan or wait for quota reset." : msg,
      data: err?.data || null,
    })
  }
}

async function syncWhapiInbound(req, res) {
  try {
    // Whapi Cloud integration removed; Evolution is now the WhatsApp backend.
    return res.status(410).json({ ok: false, message: "Whapi Cloud integration removed. Use Evolution auto-reply." })
    // Pull recent inbound messages from Whapi (works even if webhooks aren't configured/public).
    const sinceSeconds = Math.max(Number(req.query?.sinceSeconds) || 3600, 60) // default 1 hour
    const count = Math.min(Math.max(Number(req.query?.count) || 200, 1), 500)
    const timeFrom = Math.floor(Date.now() / 1000) - sinceSeconds

    const list = await whapiGet(
      `/messages/list?count=${encodeURIComponent(String(count))}&time_from=${encodeURIComponent(
        String(timeFrom)
      )}&from_me=false&sort=desc`
    )

    const msgs = Array.isArray(list?.messages) ? list.messages : []
    // Ensure chronological processing inside this sync run.
    msgs.sort((a, b) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0))
    let inserted = 0
    for (const msg of msgs) {
      // Deduplicate by Whapi message id stored in mediaId when available? We don't have a field yet.
      // Use a heuristic: same from/to/body/timestamp + provider/inbound.
      const from = String(msg?.from || "").trim()
      const to = String(msg?.chat_id || "").trim()
      if (!from || !to) continue

      const messageType = String(msg?.type || "text")
      const createdAt = msg?.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date()

      let body = ""
      if (messageType === "text") body = String(msg?.text?.body || "")
      else if (messageType === "document") body = String(msg?.document?.caption || msg?.document?.file_name || msg?.document?.filename || "[document]")
      else if (messageType === "image") body = String(msg?.image?.caption || "[image]")
      else if (messageType === "video") body = String(msg?.video?.caption || "[video]")
      else if (messageType === "audio") body = "[audio]"
      else if (messageType === "voice") body = "[voice]"
      else body = `[${messageType}]`

      const media =
        msg?.document || msg?.image || msg?.video || msg?.audio || msg?.voice || msg?.sticker || null
      const mediaId = String(media?.id || "")
      const mediaMimeType = String(media?.mime_type || "")
      const mediaFileName = String(media?.file_name || media?.filename || "")
      const mediaLink = String(media?.link || "")

      const exists = await WhatsappMessage.exists({
        provider: "whapi",
        direction: "inbound",
        from,
        to,
        body,
        createdAt,
      })
      if (exists) continue

      await WhatsappMessage.create({
        provider: "whapi",
        direction: "inbound",
        from,
        to,
        messageType,
        mediaId,
        mediaMimeType,
        mediaFileName,
        mediaLink,
        body,
        createdAt,
      })
      inserted += 1
      try {
        const { enqueue: enqueueAutoReply } = require("../services/grokAutoReply")
        enqueueAutoReply({ to: from, body, messageType, receivedAt: createdAt })
      } catch (_) {}
    }

    return res.json({ ok: true, fetched: msgs.length, inserted })
  } catch (err) {
    const status = err?.status || 500
    console.error("Whapi sync inbound error:", err?.data || err)
    const code = err?.data?.code
    const msg = err?.data?.error || err?.message || "Failed to sync inbound messages from Whapi."
    const isTrialExceeded = code === 402 || /trial version limit exceeded/i.test(msg)
    return res.status(isTrialExceeded ? 402 : status >= 400 && status <= 599 ? status : 500).json({
      ok: false,
      code: isTrialExceeded ? 402 : code,
      message: isTrialExceeded ? "Whapi trial limit exceeded. Please upgrade your Whapi plan or wait for quota reset." : msg,
      data: err?.data || null,
    })
  }
}

/**
 * GET /api/whatsapp/status
 */
async function getStatus(req, res) {
  try {
    const user = await User.findById(req.user.id).select("whatsapp").lean()
    if (!user) return res.status(404).json({ message: "User not found" })

    const w = user.whatsapp || {}
    res.json({
      connected: !!w.connected,
      phoneNumberId: w.phoneNumberId || null,
      hasToken: !!(w.accessToken && w.accessToken.length > 0),
    })
  } catch (err) {
    console.error("WhatsApp status error:", err)
    res.status(500).json({ message: "Failed to get WhatsApp status." })
  }
}

/**
 * POST /api/whatsapp/connect
 */
async function connect(req, res) {
  try {
    const { phoneNumberId, accessToken } = req.body || {}
    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({ message: "phoneNumberId and accessToken are required." })
    }

    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ message: "User not found" })

    user.whatsapp.phoneNumberId = String(phoneNumberId).trim()
    user.whatsapp.accessToken = String(accessToken).trim()
    user.whatsapp.connected = true
    await user.save()

    res.json({
      connected: true,
      phoneNumberId: user.whatsapp.phoneNumberId,
      message: "WhatsApp Business connected successfully.",
    })
  } catch (err) {
    console.error("WhatsApp connect error:", err)
    res.status(500).json({ message: "Failed to connect WhatsApp." })
  }
}

/**
 * POST /api/whatsapp/disconnect
 */
async function disconnect(req, res) {
  try {
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ message: "User not found" })

    user.whatsapp.phoneNumberId = undefined
    user.whatsapp.accessToken = undefined
    user.whatsapp.connected = false
    await user.save()

    res.json({ connected: false, message: "WhatsApp disconnected." })
  } catch (err) {
    console.error("WhatsApp disconnect error:", err)
    res.status(500).json({ message: "Failed to disconnect WhatsApp." })
  }
}

/**
 * GET /api/webhooks/whatsapp (Meta verify)
 */
function webhookVerify(req, res) {
  const mode = req.query["hub.mode"]
  const token = req.query["hub.verify_token"]
  const challenge = req.query["hub.challenge"]
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "waseel_verify"

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return res.status(200).send(challenge)
  }
  res.status(403).send("Forbidden")
}

/**
 * POST /api/webhooks/whatsapp (Meta inbound)
 */
async function webhookReceive(req, res) {
  if (req.body?.object !== "whatsapp_business_account") return res.sendStatus(404)
  res.sendStatus(200)

  try {
    const entry = req.body?.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    const phoneNumberId = value?.metadata?.phone_number_id
    const messages = value?.messages || []
    const contacts = value?.contacts || []
    if (!messages.length) return

    const user = await User.findOne({ "whatsapp.phoneNumberId": String(phoneNumberId), "whatsapp.connected": true })
      .select("_id whatsapp")
      .lean()
    if (!user?.whatsapp?.accessToken) return

    for (const msg of messages) {
      const from = msg.from
      const type = msg.type
      const text = msg.text?.body || (type === "button" ? msg.button?.text : "") || ""
      const contactName = contacts.find((c) => c.wa_id === from)?.profile?.name || from
      if (text) {
        console.log(`[WhatsApp] User ${user._id} from ${contactName} (${from}): ${text.slice(0, 120)}`)
      }
    }
  } catch (err) {
    console.error("WhatsApp webhook process error:", err)
  }
}

/**
 * POST /api/whatsapp/twilio/send-template (auth)
 * (Deprecated) Twilio sandbox was removed; keep endpoint for UI compatibility.
 */
async function sendTwilioTemplate(req, res) {
  try {
    return res.status(501).json({
      message:
        "Template sending via Twilio has been removed. This server is configured to use Whapi Cloud for WhatsApp.",
      hint: "Use /api/whatsapp/twilio/send-text (it now sends via Whapi) or implement Whapi template support if needed.",
    })
  } catch (err) {
    console.error("WhatsApp send-template (deprecated) error:", err)
    return res.status(500).json({ message: "Failed to handle template request." })
  }
}

/**
 * POST /api/whatsapp/twilio/send-text (auth)
 * Body: { to: "whatsapp:+...", body: "Hello" } (or to: "+..." will be auto-prefixed)
 */
async function sendTwilioText(req, res) {
  try {
    const { to, body } = req.body || {}
    if (!to || !body) return res.status(400).json({ message: "to and body are required." })

    const chatId = normalizeWhapiTo(to)
    if (!chatId) return res.status(400).json({ message: "Invalid 'to'. Provide whatsapp:+<countrycode><number> or digits only." })

    const bodyText = String(body)
    const data = await whapiPost("/messages/text", { to: chatId, body: bodyText })

    await WhatsappMessage.create({
      userId: req.user.id,
      provider: "whapi",
      direction: "outbound",
      from: "whapi",
      to: chatId,
      body: bodyText,
      createdAt: new Date(),
    })

    return res.json({ ok: true, provider: "whapi", result: data })
  } catch (err) {
    const status = err?.status || 500
    console.error("Whapi send-text error:", err?.data || err)
    return res.status(status >= 400 && status <= 599 ? status : 500).json({
      ok: false,
      message: err?.message || "Failed to send WhatsApp text via Whapi.",
      data: err?.data || null,
    })
  }
}

/**
 * GET /api/whatsapp/twilio/test-auth (auth)
 * Verifies server-side Whapi token without sending a message.
 */
async function testTwilioAuth(req, res) {
  try {
    const { baseUrl, token } = getWhapiConfig()
    if (!token) {
      return res.status(500).json({ ok: false, message: "WHAPI_TOKEN is missing in backend .env" })
    }
    if (typeof fetch !== "function") {
      return res.status(500).json({ ok: false, message: "This Node.js version does not support fetch(). Upgrade Node to 18+." })
    }

    const resp = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    })
    const text = await resp.text()
    let data = null
    try {
      data = text ? JSON.parse(text) : null
    } catch (_) {
      data = { raw: text }
    }
    return res.status(resp.ok ? 200 : resp.status).json({ ok: resp.ok, provider: "whapi", baseUrl, health: data })
  } catch (err) {
    console.error("Whapi test-auth error:", err?.data || err)
    const status = err?.status || 500
    return res.status(status).json({ ok: false, message: err?.message || "Whapi auth test failed.", data: err?.data || null })
  }
}

/**
 * GET /api/whatsapp/stats (auth)
 */
async function getStats(req, res) {
  try {
    const since = new Date()
    since.setHours(0, 0, 0, 0)

    const [messagesToday, inboundToday, outboundToday, recent] = await Promise.all([
      WhatsappMessage.countDocuments({ createdAt: { $gte: since } }),
      WhatsappMessage.countDocuments({ createdAt: { $gte: since }, direction: "inbound" }),
      WhatsappMessage.countDocuments({ createdAt: { $gte: since }, direction: "outbound" }),
      WhatsappMessage.find({}).sort({ createdAt: -1 }).limit(50).lean(),
    ])

    res.json({
      stats: {
        messagesToday,
        inboundToday,
        outboundToday,
      },
      messages: recent.map((m) => ({
        id: m._id,
        provider: m.provider,
        direction: m.direction,
        from: m.from,
        to: m.to,
        messageType: m.messageType || "text",
        mediaId: m.mediaId || "",
        mediaMimeType: m.mediaMimeType || "",
        mediaFileName: m.mediaFileName || "",
        mediaLink: m.mediaLink || "",
        body: m.body,
        createdAt: m.createdAt,
      })),
    })
  } catch (err) {
    console.error("WhatsApp stats error:", err)
    res.status(500).json({ message: "Failed to load WhatsApp stats." })
  }
}

module.exports = {
  getStatus,
  connect,
  disconnect,
  webhookVerify,
  webhookReceive,
  sendTwilioTemplate,
  sendTwilioText,
  testTwilioAuth,
  getWhapiMedia,
  listWhapiChats,
  listWhapiMessages,
  syncWhapiInbound,
  getStats,
}

