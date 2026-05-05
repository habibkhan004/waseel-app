const fs = require("fs")
const path = require("path")
const WhatsappMessage = require("../models/WhatsappMessage")

function getTwilioRequestUrl(req) {
  const base = process.env.PUBLIC_BASE_URL
  if (base) return `${String(base).replace(/\/$/, "")}${req.originalUrl}`
  return `${req.protocol}://${req.get("host")}${req.originalUrl}`
}

async function appendInboxLine(line) {
  const dir = path.join(__dirname, "..", "storage")
  const file = path.join(dir, "whatsapp-inbox.txt")
  await fs.promises.mkdir(dir, { recursive: true })
  await fs.promises.appendFile(file, line, { encoding: "utf8" })
}

async function receiveTwilioWhatsapp(req, res) {
  res.status(200).send("ok")

  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const signature = req.get("X-Twilio-Signature") || ""
    const shouldValidate =
      String(process.env.TWILIO_VALIDATE_SIGNATURE || "true").toLowerCase() !== "false"

    // Signature validation requires the exact public URL Twilio called.
    // In local dev without PUBLIC_BASE_URL, validation often fails (http/https mismatch).
    if (shouldValidate && authToken && signature && process.env.PUBLIC_BASE_URL) {
      const twilio = require("twilio")
      const url = getTwilioRequestUrl(req)
      const isValid = twilio.validateRequest(authToken, signature, url, req.body || {})
      if (!isValid) {
        console.warn("Twilio webhook signature invalid; ignoring message.")
        return
      }
    } else if (shouldValidate && authToken && !process.env.PUBLIC_BASE_URL) {
      console.warn("PUBLIC_BASE_URL not set; skipping Twilio signature validation.")
    }

    const messageSid = req.body?.MessageSid || ""
    const from = req.body?.From || ""
    const to = req.body?.To || ""
    const body = req.body?.Body || ""
    const profileName = req.body?.ProfileName || ""

    const ts = new Date().toISOString()
    const safeBody = String(body).replace(/\r?\n/g, " ").trim()
    const line =
      `[${ts}] sid=${messageSid} from=${from} to=${to}` +
      (profileName ? ` name="${String(profileName).replace(/"/g, "'")}"` : "") +
      ` body="${safeBody.replace(/"/g, "'")}"\n`

    await appendInboxLine(line)

    // Store inbound message in Mongo for stats / UI
    if (from && to) {
      await WhatsappMessage.create({
        provider: "twilio",
        direction: "inbound",
        from,
        to,
        body: safeBody,
        createdAt: new Date(ts),
      })
    }
  } catch (err) {
    console.error("Twilio inbound webhook error:", err)
  }
}

module.exports = { receiveTwilioWhatsapp }

