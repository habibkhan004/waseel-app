const express = require("express")
const { receiveTwilioWhatsapp } = require("../controllers/twilioWebhookController")

const router = express.Router()

router.post("/whatsapp", express.urlencoded({ extended: false }), receiveTwilioWhatsapp)

module.exports = router

