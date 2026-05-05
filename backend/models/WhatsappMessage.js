const mongoose = require("mongoose")

const whatsappMessageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    provider: { type: String, enum: ["twilio", "meta", "whapi", "evolution"], required: true },
    direction: { type: String, enum: ["inbound", "outbound"], required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    messageType: { type: String, default: "text" },
    mediaId: { type: String, default: "" },
    mediaMimeType: { type: String, default: "" },
    mediaFileName: { type: String, default: "" },
    mediaLink: { type: String, default: "" },
    body: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
)

module.exports = mongoose.model("WhatsappMessage", whatsappMessageSchema)

