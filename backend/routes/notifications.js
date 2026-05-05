const express = require("express")
const { auth } = require("../middleware/auth")
const controller = require("../controllers/notificationController")

const router = express.Router()
router.use(auth)

router.get("/", controller.list)
router.post("/read/:id", controller.markRead)
router.patch("/:id/read", controller.markRead)
router.post("/read-all", controller.markAllRead)

module.exports = router

