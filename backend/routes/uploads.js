const express = require("express")
const { auth } = require("../middleware/auth")
const { uploadImage } = require("../controllers/uploadController")

const router = express.Router()
router.use(auth)

router.post("/image", uploadImage)

module.exports = router

