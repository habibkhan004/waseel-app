import React, { useEffect, useRef, useState } from "react"
import { Circle, MessageSquare, Phone, RefreshCw, Send, Mic, Paperclip } from "lucide-react"
import axios from "axios"
import { useAuth } from "../context/AuthContext"

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"

/** WhatsApp Web dark chat tile (official asset; falls back if blocked) */
const WA_CHAT_TILE_DARK =
  "https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png"

function unwrapMessageContent(message) {
  let msg = message || {}
  if (msg.ephemeralMessage?.message) msg = msg.ephemeralMessage.message
  if (msg.viewOnceMessageV2?.message) msg = msg.viewOnceMessageV2.message
  if (msg.viewOnceMessage?.message) msg = msg.viewOnceMessage.message
  return msg
}

function WaProxiedImg({ src, token, className, alt = "" }) {
  const [blobUrl, setBlobUrl] = useState("")
  useEffect(() => {
    if (!src) {
      setBlobUrl("")
      return
    }
    if (src.startsWith("data:") || src.startsWith("blob:")) {
      setBlobUrl(src)
      return
    }
    if (!/^https?:\/\//i.test(src)) {
      setBlobUrl("")
      return
    }
    let cancelled = false
    let created = ""
    fetch(`${API_BASE}/api/whatsapp/proxy-media?url=${encodeURIComponent(src)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((blob) => {
        if (cancelled) return
        created = URL.createObjectURL(blob)
        setBlobUrl(created)
      })
      .catch(() => {
        if (!cancelled) setBlobUrl("")
      })
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [src, token])

  if (!blobUrl) {
    return <div className={`bg-[#2a3942] rounded-lg animate-pulse ${className || "h-44 w-full max-w-sm"}`} />
  }
  return <img src={blobUrl} alt={alt} className={className} loading="lazy" />
}

function WaProxiedAudio({ src, token, className }) {
  const [blobUrl, setBlobUrl] = useState("")
  useEffect(() => {
    if (!src) {
      setBlobUrl("")
      return
    }
    if (!/^https?:\/\//i.test(src)) {
      setBlobUrl(src)
      return
    }
    let cancelled = false
    let created = ""
    fetch(`${API_BASE}/api/whatsapp/proxy-media?url=${encodeURIComponent(src)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((blob) => {
        if (cancelled) return
        created = URL.createObjectURL(blob)
        setBlobUrl(created)
      })
      .catch(() => {
        if (!cancelled) setBlobUrl("")
      })
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [src, token])

  if (!blobUrl) {
    return <div className="h-10 bg-[#2a3942] rounded animate-pulse w-full min-w-[200px]" />
  }
  return <audio controls className={className} src={blobUrl} preload="metadata" />
}

function WaProxiedVideo({ src, token, className }) {
  const [blobUrl, setBlobUrl] = useState("")
  useEffect(() => {
    if (!src) {
      setBlobUrl("")
      return
    }
    if (!/^https?:\/\//i.test(src)) {
      setBlobUrl(src)
      return
    }
    let cancelled = false
    let created = ""
    fetch(`${API_BASE}/api/whatsapp/proxy-media?url=${encodeURIComponent(src)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((blob) => {
        if (cancelled) return
        created = URL.createObjectURL(blob)
        setBlobUrl(created)
      })
      .catch(() => {
        if (!cancelled) setBlobUrl("")
      })
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [src, token])

  if (!blobUrl) {
    return <div className="h-48 bg-[#2a3942] rounded-lg animate-pulse w-full max-w-sm" />
  }
  return <video src={blobUrl} controls className={className} preload="metadata" />
}

function formatParticipantLabel(raw) {
  const s = String(raw || "").trim()
  if (!s) return ""
  if (/^\d{10,}$/.test(s)) return `+${s}`
  if (/^\d+$/.test(s) && s.length >= 8) return `+${s}`
  return s
}

function canonicalChatKey(chat) {
  const raw = String(chat?.remoteJid || chat?.id || "").trim()
  if (!raw) return ""
  const [left, domain] = raw.split("@")
  if (!left) return raw
  if (domain === "lid" || domain === "s.whatsapp.net") return left.replace(/\D/g, "") || left
  return raw
}

// Avoid retry storms for expired/forbidden media
const MEDIA_FAIL_CACHE = new Set()

function EvolutionMediaRenderer({
  userId,
  token,
  evolutionMessage,
  kind,
  mimeType = "",
  fallbackUrl = "",
  thumbDataUrl = "",
}) {
  const [dataUrl, setDataUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const messageId = evolutionMessage?.key?.id || evolutionMessage?.id
  const cacheKey = `${kind}:${String(evolutionMessage?.key?.remoteJid || "")}:${String(messageId || "")}`
  const fallbackLooksBlocked =
    typeof fallbackUrl === "string" &&
    (fallbackUrl.includes("mmg.whatsapp.net") || fallbackUrl.includes(".enc?") || fallbackUrl.includes(".enc&"))

  useEffect(() => {
    if (!userId || !token || !evolutionMessage?.key?.id) return
    if (MEDIA_FAIL_CACHE.has(cacheKey)) return
    let cancelled = false
    setLoading(true)
    fetch(`${API_BASE}/api/whatsapp/media-base64/${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: evolutionMessage, convertToMp4: false }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json) => {
        if (cancelled) return
        const base64 = json?.media?.base64
        const mm = json?.media?.mimetype || mimeType || ""
        if (base64 && mm) setDataUrl(`data:${mm};base64,${base64}`)
      })
      .catch(() => {
        if (!cancelled) {
          setDataUrl("")
          MEDIA_FAIL_CACHE.add(cacheKey)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, token, cacheKey, mimeType])

  if (kind === "image" || kind === "sticker") {
    if (dataUrl) return <img src={dataUrl} alt="" className="rounded-md max-h-72 w-full object-contain" />
    if (thumbDataUrl) return <img src={thumbDataUrl} alt="" className="rounded-md max-h-60 w-full object-contain opacity-90" />
    if (fallbackUrl && !fallbackLooksBlocked) return <WaProxiedImg src={fallbackUrl} token={token} className="rounded-md max-h-72 w-full object-contain" />
    return <div className="h-32 bg-[#2a3942] rounded-md animate-pulse" />
  }
  if (kind === "audio") {
    if (dataUrl) return <audio controls className="w-full h-9 accent-[#00a884]" src={dataUrl} preload="metadata" />
    if (fallbackUrl && !fallbackLooksBlocked) return <WaProxiedAudio src={fallbackUrl} token={token} className="w-full h-9 accent-[#00a884]" />
    return <div className="h-10 bg-[#2a3942] rounded animate-pulse w-full min-w-[200px]" />
  }
  if (kind === "video") {
    if (dataUrl) return <video controls className="max-h-64 w-full rounded-md bg-black" src={dataUrl} preload="metadata" />
    if (fallbackUrl && !fallbackLooksBlocked) return <WaProxiedVideo src={fallbackUrl} token={token} className="max-h-64 w-full rounded-md bg-black" />
    return <div className="h-48 bg-[#2a3942] rounded-lg animate-pulse w-full max-w-sm" />
  }
  return loading ? <div className="h-8 bg-[#2a3942] rounded animate-pulse w-full" /> : null
}

export default function WhatsAppAIPage() {
  const { user } = useAuth()
  const [connected, setConnected] = useState(false)
  const [statusState, setStatusState] = useState("disconnected")
  const [qrBase64, setQrBase64] = useState("")
  const [loading, setLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [error, setError] = useState("")
  const [chats, setChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState("")
  const [audioInput, setAudioInput] = useState("")
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const mediaChunksRef = useRef([])

  /** Keeps latest selection for chat polling — avoids stale closure resetting to 1st chat every 5s */
  const selectedChatRef = useRef(null)
  useEffect(() => {
    selectedChatRef.current = selectedChat
  }, [selectedChat])

  const userId = user?.id

  const authHeaders = user?.token
    ? { Authorization: `Bearer ${user.token}` }
    : {}

  const fetchStatus = async () => {
    if (!userId || !user?.token) return
    try {
      setStatusLoading(true)
      const res = await axios.get(`${API_BASE}/api/whatsapp/status/${encodeURIComponent(userId)}`, {
        headers: authHeaders,
      })
      const raw = res.data?.data || res.data
      const state = raw?.instance?.state || raw?.state || "unknown"
      setStatusState(state)
      setConnected(state === "open")
    } catch (err) {
      console.error("Failed to fetch WhatsApp status", err)
    } finally {
      setStatusLoading(false)
    }
  }

  const fetchChats = async () => {
    if (!userId || !user?.token || !connected) return
    try {
      const res = await axios.get(`${API_BASE}/api/whatsapp/chats/${encodeURIComponent(userId)}`, {
        headers: authHeaders,
      })
      const list = Array.isArray(res.data?.chats) ? res.data.chats : []
      const dedupedMap = new Map()
      for (const chat of list) {
        const key = canonicalChatKey(chat) || String(chat?.remoteJid || chat?.id || Math.random())
        const existing = dedupedMap.get(key)
        if (!existing) {
          dedupedMap.set(key, chat)
          continue
        }
        const score = (c) =>
          (c?.contactName ? 4 : 0) +
          (c?.contactVerifiedName ? 3 : 0) +
          (c?.name ? 2 : 0) +
          (c?.pushName ? 2 : 0) +
          (c?.contactProfilePictureUrl ? 1 : 0)
        if (score(chat) > score(existing)) dedupedMap.set(key, chat)
      }
      const deduped = Array.from(dedupedMap.values())
      setChats(deduped)
      // Only auto-pick first chat when nothing selected (use ref so interval does not reset selection)
      if (!selectedChatRef.current && deduped.length) {
        const first = deduped[0]
        const jid = first?.remoteJid || first?.id || null
        if (jid) setSelectedChat(jid)
      }
    } catch (err) {
      console.error("Failed to fetch chats", err)
    }
  }

  const fetchMessages = async (remoteJid) => {
    if (!userId || !user?.token || !remoteJid) return
    try {
      const res = await axios.get(
        `${API_BASE}/api/whatsapp/messages/${encodeURIComponent(userId)}?remoteJid=${encodeURIComponent(remoteJid)}&limit=100`,
        { headers: authHeaders }
      )
      const raw = res.data?.messages
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.records)
          ? raw.records
          : []
      const sorted = [...list].sort(
        (a, b) => (Number(a.messageTimestamp) || 0) - (Number(b.messageTimestamp) || 0)
      )
      setMessages(sorted)
    } catch (err) {
      console.error("Failed to fetch messages", err)
    }
  }

  const fetchQrCode = async () => {
    if (!userId || !user?.token) return
    try {
      setLoading(true)
      setError("")
      const res = await axios.get(`${API_BASE}/api/whatsapp/qrcode/${encodeURIComponent(userId)}`, {
        headers: authHeaders,
      })
      const qr =
        res.data?.qrBase64 ||
        res.data?.raw?.base64 ||
        res.data?.raw?.qrCode ||
        res.data?.raw?.qrcode ||
        res.data?.raw?.qr ||
        res.data?.raw?.code ||
        ""
      setQrBase64(qr || "")
    } catch (err) {
      console.error("Failed to fetch QR code", err)
      setError("Failed to fetch QR code. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleConnectClick = async () => {
    if (!userId || !user?.token) {
      setError("User session is missing. Please sign in again.")
      return
    }
    try {
      setLoading(true)
      setError("")
      await axios.post(
        `${API_BASE}/api/whatsapp/create-instance`,
        { userId },
        { headers: authHeaders }
      )
      await fetchQrCode()
      await fetchStatus()
    } catch (err) {
      console.error("Failed to create WhatsApp instance", err)
      const msg =
        err.response?.data?.message ||
        err.response?.data?.details?.message ||
        "Failed to create WhatsApp instance. Please try again."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!userId || !user?.token) return
    try {
      setLoading(true)
      setError("")
      await axios.delete(`${API_BASE}/api/whatsapp/disconnect/${encodeURIComponent(userId)}`, {
        headers: authHeaders,
      })
      setConnected(false)
      setStatusState("disconnected")
      setQrBase64("")
      setChats([])
      setMessages([])
      setSelectedChat(null)
    } catch (err) {
      console.error("Failed to disconnect WhatsApp", err)
      setError("Failed to disconnect WhatsApp. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!userId || !user?.token) return
    fetchStatus()
    const id = setInterval(fetchStatus, 5000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    if (!connected) return
    fetchChats()
    const id = setInterval(fetchChats, 5000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, userId])

  useEffect(() => {
    if (!selectedChat || !connected) return
    fetchMessages(selectedChat)
    const id = setInterval(() => fetchMessages(selectedChat), 5000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat, connected, userId])

  const handleSendText = async () => {
    if (!messageText.trim() || !selectedChat || !userId) return
    try {
      setSending(true)
      await axios.post(
        `${API_BASE}/api/whatsapp/send-message`,
        {
          userId,
          to: selectedChat,
          message: messageText.trim(),
        },
        { headers: authHeaders }
      )
      setMessageText("")
      await fetchMessages(selectedChat)
    } catch (err) {
      console.error("Failed to send text", err)
      setError(err.response?.data?.message || "Failed to send message.")
    } finally {
      setSending(false)
    }
  }

  const handleSendVoiceFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !selectedChat || !userId) return
    try {
      setSending(true)
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result)
        r.onerror = () => reject(new Error("Failed to read audio"))
        r.readAsDataURL(file)
      })
      const audioPayload = stripDataUrl(dataUrl)
      await axios.post(
        `${API_BASE}/api/whatsapp/send-audio`,
        {
          userId,
          to: selectedChat,
          audio: audioPayload,
        },
        { headers: authHeaders }
      )
      await fetchMessages(selectedChat)
    } catch (err) {
      console.error("Failed to send voice file", err)
      setError(err.response?.data?.message || "Failed to send voice.")
    } finally {
      setSending(false)
    }
  }

  const handleSendAudio = async () => {
    if (!audioInput.trim() || !selectedChat || !userId) return
    try {
      setSending(true)
      const audioPayload = audioInput.trim().startsWith("data:") ? stripDataUrl(audioInput.trim()) : audioInput.trim()
      await axios.post(
        `${API_BASE}/api/whatsapp/send-audio`,
        {
          userId,
          to: selectedChat,
          audio: audioPayload,
        },
        { headers: authHeaders }
      )
      setAudioInput("")
      await fetchMessages(selectedChat)
    } catch (err) {
      console.error("Failed to send audio", err)
      setError(err.response?.data?.message || "Failed to send audio.")
    } finally {
      setSending(false)
    }
  }

  const handleToggleRecordVoice = async () => {
    if (!selectedChat || !userId) return
    if (recording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      let mr
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.("audio/webm;codecs=opus")) {
        mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" })
      } else if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.("audio/webm")) {
        mr = new MediaRecorder(stream, { mimeType: "audio/webm" })
      } else if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.("audio/mp4")) {
        mr = new MediaRecorder(stream, { mimeType: "audio/mp4" })
      } else {
        mr = new MediaRecorder(stream)
      }
      mediaRecorderRef.current = mr
      mediaChunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) mediaChunksRef.current.push(e.data)
      }
      mr.onstop = async () => {
        try {
          setRecording(false)
          setSending(true)
          const blob = new Blob(mediaChunksRef.current, { type: mr.mimeType || "audio/webm" })
          const dataUrl = await new Promise((resolve, reject) => {
            const r = new FileReader()
            r.onload = () => resolve(r.result)
            r.onerror = () => reject(new Error("Failed to read recording"))
            r.readAsDataURL(blob)
          })
          const audioPayload = stripDataUrl(dataUrl)
          await axios.post(
            `${API_BASE}/api/whatsapp/send-audio`,
            { userId, to: selectedChat, audio: audioPayload },
            { headers: authHeaders }
          )
          await fetchMessages(selectedChat)
        } catch (err) {
          console.error("Failed to send recorded voice", err)
          setError(err.response?.data?.message || "Failed to send recorded voice.")
        } finally {
          setSending(false)
          stream.getTracks().forEach((t) => t.stop())
          mediaRecorderRef.current = null
          mediaChunksRef.current = []
        }
      }
      mr.start()
      setRecording(true)
    } catch (err) {
      console.error("Mic access failed", err)
      setError("Microphone access denied or unavailable.")
    }
  }

  const showQr = !connected && !!qrBase64

  const messagePreview = (m) => {
    const msg = unwrapMessageContent(m?.message)
    if (msg.stickerMessage) return "Sticker"
    if (msg.conversation) return msg.conversation
    if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text
    if (msg.imageMessage) return msg.imageMessage.caption?.trim() || "[Image]"
    if (msg.videoMessage) return msg.videoMessage.caption?.trim() || "[Video]"
    if (msg.documentMessage)
      return msg.documentMessage.fileName || msg.documentMessage.caption?.trim() || "[Document]"
    if (msg.audioMessage || msg.pttMessage) return "[Voice note]"
    if (m?.messageType && m.messageType !== "conversation") return `[${m.messageType}]`
    return "[Message]"
  }

  const readStatusLabel = (m) => {
    const updates = m?.MessageUpdate
    if (!Array.isArray(updates) || !updates.length) return ""
    const last = updates[updates.length - 1]
    if (last?.status === "READ") return "Read"
    if (last?.status === "DELIVERY_ACK") return "Delivered"
    if (last?.status === "SERVER_ACK") return "Sent"
    return ""
  }

  const chatSubtitle = (chat) => {
    const lm = chat?.lastMessage
    const inner = unwrapMessageContent(lm?.message || lm)
    if (inner?.stickerMessage) return "Sticker"
    if (inner?.conversation) return inner.conversation
    if (inner?.extendedTextMessage?.text) return inner.extendedTextMessage.text
    if (inner?.imageMessage) return inner.imageMessage.caption || "Image"
    if (inner?.documentMessage) return inner.documentMessage.fileName || "Document"
    if (inner?.audioMessage) return "Voice"
    return ""
  }

  /** Prefer group subject, contact pushName, or formatted phone — not raw JIDs */
  const displayChatName = (chat) => {
    if (!chat) return ""
    const jid = String(chat.remoteJid || chat.id || "")
    const contactName = chat.contactName?.trim()
    if (contactName) return contactName
    const verified = chat.contactVerifiedName?.trim()
    if (verified) return verified
    const sub = chat.subject?.trim()
    if (sub) return sub
    if (jid.includes("@g.us")) return chat.name?.trim() || sub || "Group"
    const nm = chat.name?.trim()
    if (nm && nm !== jid) return nm
    const pn = chat.pushName?.trim()
    if (pn) return pn
    const user = jid.split("@")[0]
    if (user && /^\d{8,}$/.test(user)) return `+${user}`
    if (jid.endsWith("@lid")) return pn || `Contact (${user.slice(-4)})`
    return jid || "Chat"
  }

  const chatAvatarSrc = (chat) => {
    const u = chat?.contactProfilePictureUrl || chat?.profilePicUrl || ""
    if (!u) return ""
    if (/^https?:\/\//i.test(u)) return u
    return ""
  }

  const selectedChatMeta = chats.find((c) => String(c?.remoteJid || c?.id) === String(selectedChat))

  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, selectedChat])

  const stripDataUrl = (dataUrl) => {
    const t = String(dataUrl).trim()
    if (t.startsWith("data:") && t.includes(",")) return t.split(",").slice(1).join(",")
    return t
  }

  const renderMessageContent = (m) => {
    const msg = unwrapMessageContent(m?.message)
    const token = user?.token
    const cap = (o) => o?.caption || o?.text || ""

    if (msg.stickerMessage) {
      const st = msg.stickerMessage
      const thumb = st.jpegThumbnail ? `data:image/jpeg;base64,${st.jpegThumbnail}` : ""
      return (
        <div className="flex items-center justify-center min-w-[120px] min-h-[120px]">
          <EvolutionMediaRenderer
            userId={userId}
            token={token}
            evolutionMessage={m}
            kind="sticker"
            mimeType={st?.mimetype || "image/webp"}
            fallbackUrl={st?.url || ""}
            thumbDataUrl={thumb}
          />
        </div>
      )
    }

    if (msg.imageMessage) {
      const im = msg.imageMessage
      const thumb = im.jpegThumbnail ? `data:image/jpeg;base64,${im.jpegThumbnail}` : ""
      return (
        <div className="space-y-1 max-w-[min(100%,320px)]">
          <EvolutionMediaRenderer
            userId={userId}
            token={token}
            evolutionMessage={m}
            kind="image"
            mimeType={im?.mimetype || "image/jpeg"}
            fallbackUrl={im?.url || ""}
            thumbDataUrl={thumb}
          />
          {cap(im) ? (
            <p className="whitespace-pre-wrap break-words text-[14.2px] leading-snug text-inherit">{cap(im)}</p>
          ) : null}
        </div>
      )
    }
    if (msg.videoMessage) {
      const v = msg.videoMessage
      return (
        <div className="space-y-1 max-w-[min(100%,320px)]">
          <EvolutionMediaRenderer
            userId={userId}
            token={token}
            evolutionMessage={m}
            kind="video"
            mimeType={v?.mimetype || "video/mp4"}
            fallbackUrl={v?.url || ""}
          />
          {cap(v) ? (
            <p className="whitespace-pre-wrap break-words text-[14.2px]">{cap(v)}</p>
          ) : null}
        </div>
      )
    }
    const audio = msg.audioMessage || msg.pttMessage
    if (audio) {
      return (
        <div className="min-w-[220px] max-w-[280px] py-0.5">
          <EvolutionMediaRenderer
            userId={userId}
            token={token}
            evolutionMessage={m}
            kind="audio"
            mimeType={audio?.mimetype || "audio/ogg; codecs=opus"}
            fallbackUrl={audio?.url || ""}
          />
        </div>
      )
    }
    if (msg.documentMessage) {
      const d = msg.documentMessage
      return (
        <div className="space-y-1">
          <p className="font-medium text-[14.2px]">{d.fileName || "Document"}</p>
          {d.url && d.url.startsWith("http") ? (
            <a
              href={`${API_BASE}/api/whatsapp/proxy-media?url=${encodeURIComponent(d.url)}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#53bdeb] underline break-all"
              onClick={(e) => {
                e.preventDefault()
                fetch(`${API_BASE}/api/whatsapp/proxy-media?url=${encodeURIComponent(d.url)}`, {
                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                })
                  .then((r) => r.blob())
                  .then((blob) => {
                    const a = document.createElement("a")
                    a.href = URL.createObjectURL(blob)
                    a.download = d.fileName || "file"
                    a.click()
                    URL.revokeObjectURL(a.href)
                  })
                  .catch(() => window.open(d.url, "_blank"))
              }}
            >
              Download
            </a>
          ) : d.url ? (
            <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-[#53bdeb] underline">
              Open
            </a>
          ) : null}
        </div>
      )
    }
    if (msg.conversation) {
      return <p className="whitespace-pre-wrap break-words text-[14.2px] leading-snug">{msg.conversation}</p>
    }
    if (msg.extendedTextMessage?.text) {
      return (
        <p className="whitespace-pre-wrap break-words text-[14.2px] leading-snug">
          {msg.extendedTextMessage.text}
        </p>
      )
    }
    return <p className="whitespace-pre-wrap break-words text-[14.2px] text-[#8696a0]">{messagePreview({ ...m, message: msg })}</p>
  }

  const handleSendDocument = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !selectedChat || !userId) return
    try {
      setSending(true)
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result)
        r.onerror = () => reject(new Error("Failed to read file"))
        r.readAsDataURL(file)
      })
      const b64 = String(dataUrl).includes(",") ? String(dataUrl).split(",")[1] : String(dataUrl)
      await axios.post(
        `${API_BASE}/api/whatsapp/send-media`,
        {
          userId,
          to: selectedChat,
          mediatype: "document",
          mimetype: file.type || "application/octet-stream",
          caption: "",
          media: b64,
          fileName: file.name || "file",
        },
        { headers: authHeaders }
      )
      await fetchMessages(selectedChat)
    } catch (err) {
      console.error("Failed to send document", err)
      setError(err.response?.data?.message || "Failed to send document.")
    } finally {
      setSending(false)
    }
  }

  const qrSrc = (() => {
    if (!qrBase64) return ""
    // Evolution API may already return a full data URL (data:image/png;base64,...)
    if (qrBase64.startsWith("data:image")) return qrBase64
    return `data:image/png;base64,${qrBase64}`
  })()

  return (
    <div className="space-y-8 pb-20 md:pb-8 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-slide-up">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            WhatsApp AI
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-1 dark:text-slate-400">
            Connect your WhatsApp number through Evolution API and control it from this dashboard.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue-3)]">
            <Circle
              size={8}
              className={`${connected ? "fill-emerald-500 text-emerald-500" : "fill-red-500 text-red-500"} animate-pulse`}
            />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider dark:text-slate-300">
              {connected ? "WhatsApp: Connected" : "WhatsApp: Disconnected"}
            </span>
          </div>
          {connected ? (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-2.5 font-bold text-sm hover:bg-red-100 dark:border-red-900 dark:bg-red-900/30 dark:text-red-300 disabled:opacity-60"
            >
              <Phone size={18} />
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnectClick}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--dark-blue)] text-white px-4 py-2.5 font-bold text-sm hover:opacity-90 dark:bg-white dark:text-[var(--dark-blue)] disabled:opacity-60"
            >
              <Phone size={18} />
              {loading ? "Connecting..." : "Connect WhatsApp"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="animate-fade-slide-up">
          <div className="rounded-2xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm dark:border-red-900 dark:bg-red-900/30 dark:text-red-100">
            {error}
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 animate-fade-slide-up">
        <div className="bg-white dark:bg-[var(--dark-blue)] border border-slate-200 dark:border-[var(--dark-blue-3)] rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
            <MessageSquare size={18} />
            Connection status
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Status from Evolution API:{" "}
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {statusLoading ? "Checking..." : statusState || "unknown"}
            </span>
          </p>
          {!connected && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              After connecting, scan the QR code using WhatsApp on your phone to link this device.
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-[var(--dark-blue)] border border-slate-200 dark:border-[var(--dark-blue-3)] rounded-2xl p-6 flex flex-col items-center justify-center">
          {showQr ? (
            <>
              <h3 className="font-bold text-slate-900 dark:text-white mb-3">
                Scan this QR code
              </h3>
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 mb-4">
                <img
                  src={qrSrc}
                  alt="WhatsApp QR Code"
                  className="w-48 h-48 object-contain"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={fetchQrCode}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 px-4 py-2.5 font-bold text-sm hover:bg-slate-100 dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue-3)] dark:text-slate-100 disabled:opacity-60"
                >
                  <RefreshCw size={16} />
                  {loading ? "Refreshing..." : "Refresh QR"}
                </button>
              </div>
            </>
          ) : connected ? (
            <>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                WhatsApp connected
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Your Evolution API instance is connected. You can now send and receive messages via the backend.
              </p>
            </>
          ) : (
            <>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                QR code not yet generated
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                Click &quot;Connect WhatsApp&quot; to create an Evolution API instance and load the QR code.
              </p>
              <button
                type="button"
                onClick={handleConnectClick}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--dark-blue)] text-white px-4 py-2.5 font-bold text-sm hover:opacity-90 dark:bg-white dark:text-[var(--dark-blue)] disabled:opacity-60"
              >
                <Phone size={18} />
                {loading ? "Connecting..." : "Connect WhatsApp"}
              </button>
            </>
          )}
        </div>
      </div>

      {connected && (
        <div className="animate-fade-slide-up rounded-xl overflow-hidden border border-[#2a3942] shadow-2xl flex flex-col lg:flex-row h-[min(560px,calc(100vh-240px))] max-h-[calc(100vh-200px)] min-h-[420px] bg-[#111b21]">
          {/* WhatsApp Web — chat list */}
          <div className="w-full lg:w-[360px] shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-[#2a3942] min-h-0 max-h-[40vh] lg:max-h-none">
            <div className="h-14 shrink-0 flex items-center px-4 bg-[#202c33] border-b border-[#2a3942]">
              <span className="text-[16px] font-semibold text-[#e9edef]">Chats</span>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain [scrollbar-width:thin]">
              {chats.map((chat, idx) => {
                const jid = chat?.remoteJid || chat?.id || `chat-${idx}`
                const title = displayChatName(chat)
                const preview = chatSubtitle(chat)
                const active = String(selectedChat) === String(jid)
                return (
                  <button
                    key={jid}
                    type="button"
                    onClick={() => setSelectedChat(jid)}
                    className={`w-full text-left px-3 py-2.5 border-b border-[#222e35] transition-colors ${
                      active ? "bg-[#2a3942]" : "hover:bg-[#202c33]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#2a3942] overflow-hidden shrink-0 mt-0.5">
                        {chatAvatarSrc(chat) ? (
                          <WaProxiedImg
                            src={chatAvatarSrc(chat)}
                            token={user?.token}
                            className="w-10 h-10 object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 flex items-center justify-center text-[#aebac1] text-sm font-semibold">
                            {(title || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[16px] font-medium text-[#e9edef] truncate leading-tight">{title}</p>
                        {preview ? (
                          <p className="text-[13px] text-[#8696a0] truncate mt-0.5">{preview}</p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                )
              })}
              {!chats.length && (
                <p className="px-4 py-8 text-sm text-[#8696a0] text-center">No chats yet.</p>
              )}
            </div>
          </div>

          {/* WhatsApp Web — conversation */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#0b141a]">
            <div className="h-14 shrink-0 flex flex-col justify-center px-4 bg-[#202c33] border-b border-[#2a3942]">
              <p className="text-[16px] font-medium text-[#e9edef] truncate">
                {selectedChatMeta ? displayChatName(selectedChatMeta) : "Select a chat"}
              </p>
              {selectedChat ? (
                <p className="text-[12px] text-[#8696a0] truncate" title={selectedChat}>
                  {selectedChat}
                </p>
              ) : null}
            </div>

            <div
              className="flex-1 overflow-y-auto min-h-0 px-3 py-2 space-y-1 overscroll-contain [scrollbar-width:thin]"
              style={{
                backgroundColor: "#0b141a",
                backgroundImage: `url(${WA_CHAT_TILE_DARK})`,
                backgroundRepeat: "repeat",
                backgroundBlendMode: "soft-light",
              }}
            >
              {messages.map((m, idx) => {
                const fromMe = !!m?.key?.fromMe
                const readLbl = fromMe ? readStatusLabel(m) : ""
                const ts = m?.messageTimestamp
                  ? new Date(Number(m.messageTimestamp) * 1000).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""
                const participant = m?.key?.participant
                const rawSender = m?.pushName || (participant ? String(participant).split("@")[0] : "")
                const senderShow = formatParticipantLabel(rawSender) || rawSender
                const isSticker = !!(unwrapMessageContent(m?.message)?.stickerMessage)
                const senderLabel =
                  !fromMe && senderShow ? (
                    <p className="text-[12.5px] font-medium text-[#53bdeb] mb-1">{senderShow}</p>
                  ) : null
                return (
                  <div key={m?.key?.id || m?.id || idx} className={`flex w-full ${fromMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={
                        isSticker
                          ? "max-w-[90%] p-0"
                          : `max-w-[75%] sm:max-w-[65%] rounded-lg px-2 py-1.5 shadow-sm ${
                              fromMe
                                ? "bg-[#005c4b] text-[#e9edef] rounded-br-none"
                                : "bg-[#202c33] text-[#e9edef] rounded-bl-none"
                            }`
                      }
                    >
                      {senderLabel}
                      <div className={`${isSticker ? "" : "px-1"} text-[14.2px] leading-snug`}>
                        {renderMessageContent(m)}
                      </div>
                      {!isSticker ? (
                        <div className="mt-0.5 flex items-center justify-end gap-1.5 px-1 pb-0.5">
                          <span className="text-[11px] text-[#8696a0] tabular-nums">{ts}</span>
                          {fromMe && readLbl ? (
                            <span className="text-[11px] text-[#53bdeb] font-medium">{readLbl}</span>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex justify-end px-0 pb-1 pt-0.5">
                          <span className="text-[11px] text-[#8696a0] tabular-nums">{ts}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} className="h-1" />
              {!messages.length && selectedChat && (
                <p className="text-center text-sm text-[#8696a0] py-12">No messages in this chat.</p>
              )}
            </div>

            <div className="shrink-0 bg-[#202c33] border-t border-[#2a3942] p-2 space-y-2">
              <div className="flex gap-2 items-end">
                <label className="cursor-pointer shrink-0 flex items-center justify-center w-10 h-10 rounded-full text-[#8696a0] hover:bg-[#2a3942]">
                  <Paperclip size={22} strokeWidth={1.5} />
                  <input type="file" className="hidden" onChange={handleSendDocument} disabled={sending || !selectedChat} />
                </label>
                <div className="flex-1 min-w-0 rounded-lg bg-[#2a3942] flex items-center px-3 py-2 border border-transparent focus-within:border-[#2a3942]">
                  <input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendText()
                      }
                    }}
                    placeholder="Type a message"
                    disabled={!selectedChat}
                    className="w-full bg-transparent outline-none text-[15px] text-[#e9edef] placeholder:text-[#8696a0]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendText}
                  disabled={sending || !selectedChat}
                  className="shrink-0 w-10 h-10 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center hover:bg-[#06cf9c] disabled:opacity-40 disabled:hover:bg-[#00a884]"
                  aria-label="Send"
                >
                  <Send size={20} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 items-center px-1">
                <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] text-[#8696a0] hover:bg-[#2a3942]">
                  <Mic size={16} />
                  Voice file
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleSendVoiceFile}
                    disabled={sending || !selectedChat}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleToggleRecordVoice}
                  disabled={sending || !selectedChat}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] ${
                    recording ? "text-[#ff6b6b] bg-[#2a3942]" : "text-[#8696a0] hover:bg-[#2a3942]"
                  } disabled:opacity-40`}
                >
                  <Mic size={16} />
                  {recording ? "Stop & send" : "Record"}
                </button>
                <input
                  value={audioInput}
                  onChange={(e) => setAudioInput(e.target.value)}
                  placeholder="Audio URL / base64"
                  className="flex-1 min-w-[120px] px-3 py-1.5 rounded-lg bg-[#2a3942] text-[13px] text-[#e9edef] placeholder:text-[#8696a0] outline-none border border-transparent"
                />
                <button
                  type="button"
                  onClick={handleSendAudio}
                  disabled={sending || !selectedChat}
                  className="text-[13px] text-[#53bdeb] font-medium px-2 disabled:opacity-40"
                >
                  Send voice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
