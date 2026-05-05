const express = require("express")
const { auth } = require("../middleware/auth")
const controller = require("../controllers/productController")

const router = express.Router()

router.use(auth)

router.get("/", controller.getAll)
router.get("/:id", controller.getOne)
router.post("/", controller.create)
router.put("/:id", controller.update)
router.delete("/:id", controller.remove)

module.exports = router

