const express = require("express")
const { auth } = require("../middleware/auth")
const controller = require("../controllers/storeController")

const router = express.Router()

router.use(auth)

router.get("/", controller.list)
router.post("/shopify", controller.connectShopify)
router.post("/woocommerce", controller.connectWoo)
router.post("/custom", controller.connectCustom)
router.post("/:id/sync", controller.sync)
router.delete("/:id", controller.remove)

module.exports = router
