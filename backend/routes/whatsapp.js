const express = require("express")
const axios = require("axios")
const { auth } = require("../middleware/auth")
const controller = require("../controllers/whatsappController")
const evolutionVoice = require("../services/evolutionVoice")

const router = express.Router()
router.use(auth)

// Existing Meta integration
router.get("/status", controller.getStatus)
router.post("/connect", controller.connect)
router.post("/disconnect", controller.disconnect)
router.get("/stats", controller.getStats)

// --- Evolution API (WhatsApp) integration ---

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

const getInstanceName = (userId) => `user_${String(userId)}`.trim()
const resolveUserId = (req) => req?.user?.id || req?.params?.userId || req?.body?.userId || ""

async function deleteEvolutionInstance(instanceName) {
  const encoded = encodeURIComponent(instanceName)
  const attempts = [
    () => evolutionClient.delete(`/instance/delete/${encoded}`),
    () => evolutionClient.delete(`/instance/deleteInstance/${encoded}`),
    () => evolutionClient.delete(`/instance/delete?instanceName=${encoded}`),
    () => evolutionClient.delete(`/instance/delete`, { data: { instanceName } }),
    () => evolutionClient.post(`/instance/delete/${encoded}`),
    () => evolutionClient.post(`/instance/delete`, { instanceName }),
    () => evolutionClient.post(`/instance/deleteInstance/${encoded}`),
    () => evolutionClient.post(`/instance/deleteInstance`, { instanceName }),
  ]

  let lastError = null
  for (const attempt of attempts) {
    try {
      const result = await attempt()
      const data = result?.data || null
      // eslint-disable-next-line no-console
      console.log("Evolution instance delete succeeded", { instanceName, data })
      return { ok: true, data }
    } catch (err) {
      const status = err?.response?.status
      const msgRaw = err?.response?.data?.response?.message?.[0] || err?.response?.data?.message || err?.response?.data?.error || err?.message
      const msg = String(msgRaw || "").toLowerCase()
      if (status === 404 || msg.includes("does not exist") || msg.includes("not found")) {
        // eslint-disable-next-line no-console
        console.log("Evolution instance already absent", { instanceName, status, msg: msgRaw })
        return { ok: true, data: null, notFound: true }
      }
      lastError = err
    }
  }

  return { ok: false, error: lastError }
}

const handleEvolutionError = (err, res) => {
  // Log full response body (if any) to help debug Evolution API issues
  if (err.response) {
    // eslint-disable-next-line no-console
    console.error("Evolution API error:", err.response.data)
    return res
      .status(err.response.status || 500)
      .json({
        message:
          err.response.data?.message ||
          err.response.data?.error ||
          "Evolution API request failed.",
        details: err.response.data || null,
      })
  }

  // eslint-disable-next-line no-console
  console.error("Evolution API error (no response):", err?.message || err)

  return res.status(500).json({
    message: "Evolution API request failed.",
    details: err.message || "Unknown error",
  })
}

// POST /api/whatsapp/create-instance
router.post("/create-instance", async (req, res) => {
  const userId = resolveUserId(req)
  if (!userId) return res.status(400).json({ message: "userId is required." })

  const instanceName = getInstanceName(userId)

  try {
    const { data } = await evolutionClient.post("/instance/create", {
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
    })

    return res.status(201).json({ instanceName, data })
  } catch (err) {
    // Evolution API is not strictly idempotent: it can return 403 when the instance name already exists.
    // Treat that as a success so the frontend can proceed to fetch QR/status.
    const status = err?.response?.status
    const msgRaw = err?.response?.data?.message || err?.response?.data?.error || err?.message
    const msg = Array.isArray(msgRaw) ? msgRaw.join(" ") : String(msgRaw || "")

    if (status === 403 && msg.toLowerCase().includes("already in use")) {
      try {
        const { data } = await evolutionClient.get(
          `/instance/connectionState/${encodeURIComponent(instanceName)}`
        )
        return res.status(200).json({ instanceName, data, reused: true })
      } catch (_) {
        return res.status(200).json({ instanceName, data: null, reused: true })
      }
    }

    return handleEvolutionError(err, res)
  }
})

// GET /api/whatsapp/qrcode/:userId
router.get("/qrcode/:userId", async (req, res) => {
  try {
    const userId = resolveUserId(req)
    if (!userId) {
      return res.status(400).json({ message: "userId is required." })
    }

    const instanceName = getInstanceName(userId)
    const { data } = await evolutionClient.get(`/instance/connect/${encodeURIComponent(instanceName)}`)

    // The Evolution API typically returns fields like `code` and `pairingCode`.
    // Some deployments may also return a base64 image field.
    const qrBase64 =
      data?.base64 || data?.qrCode || data?.qrcode || data?.qr || data?.code || null

    return res.json({
      instanceName,
      raw: data,
      qrBase64,
    })
  } catch (err) {
    return handleEvolutionError(err, res)
  }
})

// GET /api/whatsapp/status/:userId
router.get("/status/:userId", async (req, res) => {
  try {
    const userId = resolveUserId(req)
    if (!userId) {
      return res.status(400).json({ message: "userId is required." })
    }

    const instanceName = getInstanceName(userId)
    const { data } = await evolutionClient.get(
      `/instance/connectionState/${encodeURIComponent(instanceName)}`
    )

    return res.json({ instanceName, data })
  } catch (err) {
    const msg = err?.response?.data?.response?.message?.[0] || err?.response?.data?.message
    if (err?.response?.status === 404 && String(msg || "").includes("does not exist")) {
      // Graceful status for users who have not created/connected instance yet
      return res.json({ instanceName: getInstanceName(req.params.userId), data: { instance: { state: "close" } } })
    }
    return handleEvolutionError(err, res)
  }
})

// DELETE /api/whatsapp/disconnect/:userId
router.delete("/disconnect/:userId", async (req, res) => {
  try {
    const userId = resolveUserId(req)
    if (!userId) {
      return res.status(400).json({ message: "userId is required." })
    }

    const instanceName = getInstanceName(userId)
    const logoutResult = await evolutionClient
      .delete(`/instance/logout/${encodeURIComponent(instanceName)}`)
      .then((r) => ({ ok: true, data: r?.data || null }))
      .catch((err) => {
        const msg = err?.response?.data?.response?.message?.[0] || err?.response?.data?.message || err?.response?.data?.error || err?.message
        if (err?.response?.status === 404 && String(msg || "").toLowerCase().includes("does not exist")) {
          return { ok: true, data: null, notFound: true }
        }
        return { ok: false, error: err }
      })

    const deleteResult = await deleteEvolutionInstance(instanceName)

    if (!deleteResult.ok) {
      // eslint-disable-next-line no-console
      console.error("Evolution instance delete failed", {
        instanceName,
        status: deleteResult?.error?.response?.status,
        details: deleteResult?.error?.response?.data || deleteResult?.error?.message,
      })
    }

    if (!logoutResult.ok && !deleteResult.ok) {
      return handleEvolutionError(logoutResult.error || deleteResult.error, res)
    }

    return res.json({
      instanceName,
      loggedOut: logoutResult.ok,
      deleted: deleteResult.ok,
      deleteError: deleteResult.ok
        ? null
        : (deleteResult?.error?.response?.data || deleteResult?.error?.message || "Delete failed"),
      data: logoutResult.data || deleteResult.data || null,
      details: {
        logoutNotFound: !!logoutResult.notFound,
        deleteNotFound: !!deleteResult.notFound,
      },
    })
  } catch (err) {
    const msg = err?.response?.data?.response?.message?.[0] || err?.response?.data?.message
    if (err?.response?.status === 404 && String(msg || "").includes("does not exist")) {
      return res.json({ instanceName: getInstanceName(req.params.userId), chats: [], raw: null })
    }
    return handleEvolutionError(err, res)
  }
})

// POST /api/whatsapp/send-message
router.post("/send-message", async (req, res) => {
  try {
    const userId = resolveUserId(req)
    const { to, message } = req.body || {}
    if (!userId || !to || !message) {
      return res.status(400).json({ message: "userId, to, and message are required." })
    }

    const instanceName = getInstanceName(userId)
    const payload = {
      number: evolutionRecipientNumber(to),
      text: String(message),
    }

    const { data } = await evolutionClient.post(
      `/message/sendText/${encodeURIComponent(instanceName)}`,
      payload
    )

    return res.status(201).json({ instanceName, data })
  } catch (err) {
    const msg = err?.response?.data?.response?.message?.[0] || err?.response?.data?.message
    if (err?.response?.status === 404 && String(msg || "").includes("does not exist")) {
      return res.json({ instanceName: getInstanceName(req.params.userId), messages: [], meta: undefined, raw: null })
    }
    return handleEvolutionError(err, res)
  }
})

// GET /api/whatsapp/chats/:userId
router.get("/chats/:userId", async (req, res) => {
  try {
    const userId = resolveUserId(req)
    const limit = Number(req.query.limit || 50)
    if (!userId) {
      return res.status(400).json({ message: "userId is required." })
    }

    const instanceName = getInstanceName(userId)
    const { data } = await evolutionClient.post(
      `/chat/findChats/${encodeURIComponent(instanceName)}`,
      {
        limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 50,
      }
    )

    let chats = []
    if (Array.isArray(data)) chats = data
    else if (Array.isArray(data?.chats)) chats = data.chats
    else if (Array.isArray(data?.records)) chats = data.records
    else if (Array.isArray(data?.data)) chats = data.data

    const isStatusChat = (remoteJidOrId) => {
      const jid = String(remoteJidOrId || "").trim().toLowerCase()
      if (!jid) return false
      return jid.includes("status@broadcast") || (jid.startsWith("status@") && jid.includes("@broadcast"))
    }

    // WhatsApp "Status" updates use a special chat JID like `status@broadcast` and should not be shown.
    chats = chats.filter((chat) => !isStatusChat(chat?.remoteJid || chat?.id))

    const sanitizeChat = (chat) => {
      if (!chat || typeof chat !== "object") return chat
      const { status, lastMessage, ...rest } = chat
      const cleanedLastMessage =
        lastMessage && typeof lastMessage === "object"
          ? (() => {
              const { status: _lmStatus, ...lmRest } = lastMessage
              return lmRest
            })()
          : lastMessage

      return { ...rest, lastMessage: cleanedLastMessage }
    }

    // Enrich chats with contact names/profile pictures when available
    try {
      const contactsResp = await evolutionClient.post(
        `/chat/findContacts/${encodeURIComponent(instanceName)}`,
        { limit: 1000 }
      )
      const cData = contactsResp?.data
      const contacts = Array.isArray(cData)
        ? cData
        : Array.isArray(cData?.contacts)
          ? cData.contacts
          : Array.isArray(cData?.records)
            ? cData.records
            : Array.isArray(cData?.data)
              ? cData.data
              : []

      const byJid = new Map()
      contacts.forEach((c) => {
        const key = String(c?.remoteJid || c?.id || "").trim()
        if (key) byJid.set(key, c)
      })

      chats = chats.map((chat) => {
        const key = String(chat?.remoteJid || chat?.id || "").trim()
        const c = byJid.get(key)
        if (!c) return chat
        return {
          ...chat,
          contactName: c?.pushName || c?.name || "",
          contactProfilePictureUrl: c?.profilePictureUrl || c?.profilePicUrl || "",
          contactVerifiedName: c?.verifiedName || "",
        }
      })
    } catch (_) {
      // contacts enrichment is optional
    }

    // Remove `status` from Evolution chat objects to avoid exposing it in the UI.
    chats = chats.map(sanitizeChat)

    // Also remove `status` from raw payload if it includes chat entries.
    let raw = data
    if (Array.isArray(data))
      raw = data.filter((c) => !isStatusChat(c?.remoteJid || c?.id)).map(sanitizeChat)
    else if (Array.isArray(data?.chats))
      raw = { ...data, chats: data.chats.filter((c) => !isStatusChat(c?.remoteJid || c?.id)).map(sanitizeChat) }
    else if (Array.isArray(data?.records))
      raw = { ...data, records: data.records.filter((c) => !isStatusChat(c?.remoteJid || c?.id)).map(sanitizeChat) }
    else if (Array.isArray(data?.data))
      raw = { ...data, data: data.data.filter((c) => !isStatusChat(c?.remoteJid || c?.id)).map(sanitizeChat) }

    return res.json({ instanceName, chats, raw })
  } catch (err) {
    return handleEvolutionError(err, res)
  }
})

// GET /api/whatsapp/messages/:userId?remoteJid=...
router.get("/messages/:userId", async (req, res) => {
  try {
    const userId = resolveUserId(req)
    const { remoteJid } = req.query || {}
    if (!userId || !remoteJid) {
      return res.status(400).json({ message: "userId and remoteJid are required." })
    }

    const instanceName = getInstanceName(userId)
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200)
    const { data } = await evolutionClient.post(
      `/chat/findMessages/${encodeURIComponent(instanceName)}`,
      {
        where: {
          key: {
            remoteJid: String(remoteJid),
          },
        },
        limit,
      }
    )

    // Evolution v2 returns { messages: { records: [], total, pages, currentPage } }
    let messages = []
    if (Array.isArray(data)) messages = data
    else if (Array.isArray(data?.messages?.records)) messages = data.messages.records
    else if (Array.isArray(data?.messages)) messages = data.messages
    else if (Array.isArray(data?.records)) messages = data.records
    else if (Array.isArray(data?.data)) messages = data.data

    return res.json({
      instanceName,
      messages,
      meta: data?.messages && typeof data.messages === "object" && !Array.isArray(data.messages)
        ? { total: data.messages.total, pages: data.messages.pages, currentPage: data.messages.currentPage }
        : undefined,
      raw: data,
    })
  } catch (err) {
    return handleEvolutionError(err, res)
  }
})

function evolutionRecipientNumber(remoteJidOrNumber) {
  const s = String(remoteJidOrNumber || "").trim()
  if (!s) return s
  if (s.includes("@g.us")) return s
  if (s.endsWith("@lid")) return s
  const before = s.split("@")[0]
  return before.replace(/\D/g, "") || before
}

// POST /api/whatsapp/send-media
router.post("/send-media", async (req, res) => {
  try {
    const userId = resolveUserId(req)
    const { to, mediatype, mimetype, media, fileName, caption = "" } = req.body || {}
    if (!userId || !to || !mediatype || !mimetype || !media || !fileName) {
      return res.status(400).json({
        message: "userId, to, mediatype, mimetype, media, and fileName are required.",
      })
    }

    const instanceName = getInstanceName(userId)
    const number = evolutionRecipientNumber(to)
    const payload = {
      number,
      mediatype: String(mediatype),
      mimetype: String(mimetype),
      caption: String(caption),
      media: String(media).trim(),
      fileName: String(fileName),
    }

    const { data } = await evolutionClient.post(
      `/message/sendMedia/${encodeURIComponent(instanceName)}`,
      payload
    )

    return res.status(201).json({ instanceName, data })
  } catch (err) {
    return handleEvolutionError(err, res)
  }
})

// POST /api/whatsapp/send-audio
router.post("/send-audio", async (req, res) => {
  try {
    const userId = resolveUserId(req)
    const { to, audio } = req.body || {}
    if (!userId || !to || !audio) {
      return res.status(400).json({ message: "userId, to, and audio are required." })
    }

    const instanceName = getInstanceName(userId)
    const useEncoding = evolutionVoice.whatsAppAudioEncodingDefaultOn()
    const payload = {
      number: evolutionRecipientNumber(to),
      audio: evolutionVoice.audioMp3Base64ForEvolutionSend(String(audio).trim()),
      ...(useEncoding ? { encoding: true } : {}),
    }

    const { data } = await evolutionClient.post(
      `/message/sendWhatsAppAudio/${encodeURIComponent(instanceName)}`,
      payload,
      { timeout: 120000 }
    )

    return res.status(201).json({ instanceName, data })
  } catch (err) {
    return handleEvolutionError(err, res)
  }
})

// Stream WhatsApp/Facebook CDN media through backend (browser cannot attach JWT to <img>/<audio> src)
router.get("/proxy-media", async (req, res) => {
  try {
    const rawUrl = req.query.url
    if (!rawUrl || typeof rawUrl !== "string") {
      return res.status(400).json({ message: "url query is required." })
    }
    let target
    try {
      target = decodeURIComponent(rawUrl)
    } catch {
      return res.status(400).json({ message: "Invalid url encoding." })
    }
    if (!/^https:\/\//i.test(target)) {
      return res.status(400).json({ message: "Only https URLs are allowed." })
    }
    const host = new URL(target).hostname
    const allowed =
      /whatsapp\.net$/i.test(host) ||
      /whatsapp\.com$/i.test(host) ||
      /fbcdn\.net$/i.test(host) ||
      /facebook\.com$/i.test(host)
    if (!allowed) {
      return res.status(400).json({ message: "URL host not allowed for media proxy." })
    }

    const upstream = await axios.get(target, {
      responseType: "stream",
      timeout: 120000,
      maxContentLength: 50 * 1024 * 1024,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://web.whatsapp.com/",
      },
      validateStatus: (s) => s >= 200 && s < 400,
    })

    const ct = upstream.headers["content-type"] || "application/octet-stream"
    res.setHeader("Content-Type", ct)
    res.setHeader("Cache-Control", "private, max-age=3600")
    upstream.data.pipe(res)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("proxy-media:", err?.message || err)
    if (!res.headersSent) {
      res.status(502).json({ message: "Failed to load media." })
    }
  }
})

// Resolve WhatsApp media as base64 from Evolution (more reliable than direct CDN links).
// Evolution uses the full WebMessageInfo when `message.message` is present; sending only key.id
// forces a DB lookup that often lacks mediaKey → Baileys "Cannot derive from empty media key".
router.post("/media-base64/:userId", async (req, res) => {
  try {
    const userId = resolveUserId(req)
    const { message, convertToMp4 = false } = req.body || {}
    if (!userId || !message || typeof message !== "object") {
      return res.status(400).json({
        message: "userId and a JSON body with `message` (full Evolution message from findMessages) are required.",
      })
    }
    const mid = String(message?.key?.id || "").trim()
    if (!mid) {
      return res.status(400).json({ message: "message.key.id is required." })
    }

    const instanceName = getInstanceName(userId)
    const { data } = await evolutionClient.post(
      `/chat/getBase64FromMediaMessage/${encodeURIComponent(instanceName)}`,
      {
        message,
        convertToMp4: !!convertToMp4,
      }
    )

    return res.json({ instanceName, media: data })
  } catch (err) {
    return handleEvolutionError(err, res)
  }
})

router.get("/media-base64/:userId", async (req, res) => {
  try {
    const userId = resolveUserId(req)
    const { messageId, remoteJid, fromMe = "false", convertToMp4 = "false" } = req.query
    if (!userId || !messageId || !remoteJid) {
      return res.status(400).json({
        message:
          "userId, messageId, and remoteJid are required. Prefer POST /media-base64/:userId with the full `message` object for reliable media decryption.",
      })
    }

    const instanceName = getInstanceName(userId)
    const { data } = await evolutionClient.post(
      `/chat/getBase64FromMediaMessage/${encodeURIComponent(instanceName)}`,
      {
        message: {
          key: {
            id: String(messageId),
            remoteJid: String(remoteJid),
            fromMe: String(fromMe).toLowerCase() === "true",
          },
        },
        convertToMp4: String(convertToMp4) === "true",
      }
    )

    return res.json({ instanceName, media: data })
  } catch (err) {
    return handleEvolutionError(err, res)
  }
})

module.exports = router
