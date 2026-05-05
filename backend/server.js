// @ts-nocheck
/**
 * Legacy entrypoint kept for compatibility.
 *
 * The real server entrypoint is `app.js` (used by `npm start`).
 * This file forwards to `app.js` to avoid duplicated server code.
 */
require("./app")

/**
 * Legacy entrypoint kept for compatibility.
 *
 * The real server entrypoint is `app.js` (used by `npm start`).
 * This file forwards to `app.js` to prevent duplicated code and redeclare errors.
 */
require("./app")

const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const mongoose = require("mongoose")
const cors = require("cors")
const dotenv = require("dotenv")

dotenv.config()

const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")

const User = require("./models/User")
const Notification = require("./models/Notification")
const { sendPasswordResetEmail } = require("./services/email")
const { auth, adminOnly } = require("./middleware/auth")

const productRoutes = require("./routes/products")
const serviceRoutes = require("./routes/services")
const uploadRoutes = require("./routes/uploads")
const notificationRoutes = require("./routes/notifications")
const whatsappRoutes = require("./routes/whatsapp")
const twilioWebhooksRoutes = require("./routes/twilioWebhooks")
const whatsappController = require("./controllers/whatsappController")

const app = express()
const server = http.createServer(app)
new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } })

app.use(cors())
app.use(express.json({ limit: "10mb" }))

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Waseel backend foundation is running" })
})

// Routes
app.use("/api/products", productRoutes)
app.use("/api/services", serviceRoutes)
app.use("/api/uploads", uploadRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/whatsapp", whatsappRoutes)

// Meta WhatsApp webhook (public)
app.get("/api/webhooks/whatsapp", whatsappController.webhookVerify)
app.post("/api/webhooks/whatsapp", whatsappController.webhookReceive)

// Twilio inbound WhatsApp webhook (public)
app.use("/api/webhooks/twilio", twilioWebhooksRoutes)

// ---- Auth ----
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, role = "client", plan = "beta", whatsapp = {}, aiSettings = {} } = req.body || {}
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required." })
    }

    const existing = await User.findOne({ email: String(email).toLowerCase() })
    if (existing) return res.status(409).json({ message: "An account with this email already exists." })

    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)

    const user = await User.create({
      name,
      email: String(email).toLowerCase(),
      password: hash,
      role,
      plan,
      whatsapp,
      aiSettings,
      authProvider: "email",
    })

    try {
      await Notification.create({
        userId: user._id,
        title: "Welcome to Waseel AI",
        message: "Your account has been created successfully.",
        type: "success",
      })
    } catch (_) {}

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, plan: user.plan },
      process.env.JWT_SECRET || "change-me",
      { expiresIn: "7d" }
    )

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        whatsapp: { connected: !!user.whatsapp?.connected, phoneNumberId: user.whatsapp?.phoneNumberId || null },
        aiSettings: user.aiSettings,
        createdAt: user.createdAt,
      },
      token,
    })
  } catch (err) {
    console.error("Signup error:", err)
    res.status(500).json({ message: "Failed to create account." })
  }
})

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." })

    const user = await User.findOne({ email: String(email).toLowerCase() })
    if (!user || user.authProvider !== "email") {
      return res.status(401).json({ message: "Invalid email or password." })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password." })

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, plan: user.plan },
      process.env.JWT_SECRET || "change-me",
      { expiresIn: "7d" }
    )

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        whatsapp: { connected: !!user.whatsapp?.connected, phoneNumberId: user.whatsapp?.phoneNumberId || null },
        aiSettings: user.aiSettings,
        createdAt: user.createdAt,
      },
      token,
    })
  } catch (err) {
    console.error("Login error:", err)
    res.status(500).json({ message: "Failed to log in." })
  }
})

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {}
    if (!email) return res.status(400).json({ message: "Email is required." })

    const user = await User.findOne({ email: String(email).toLowerCase(), authProvider: "email" })
    if (!user) return res.json({ message: "If that email exists, a reset link has been sent." })

    const rawToken = crypto.randomBytes(32).toString("hex")
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex")
    user.resetPasswordToken = hashedToken
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000)
    await user.save()

    await sendPasswordResetEmail(user.email, rawToken)
    return res.json({ message: "If that email exists, a reset link has been sent." })
  } catch (err) {
    console.error("Forgot password error:", err)
    res.status(500).json({ message: "Failed to start password reset." })
  }
})

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body || {}
    if (!token || !password) return res.status(400).json({ message: "Token and new password are required." })

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    })
    if (!user) return res.status(400).json({ message: "Reset token is invalid or has expired." })

    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(password, salt)
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined
    await user.save()

    try {
      await Notification.create({
        userId: user._id,
        title: "Password updated",
        message: "Your password was changed successfully.",
        type: "success",
      })
    } catch (_) {}

    res.json({ message: "Password has been reset successfully." })
  } catch (err) {
    console.error("Reset password error:", err)
    res.status(500).json({ message: "Failed to reset password." })
  }
})

app.get("/api/auth/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -resetPasswordToken -resetPasswordExpires")
    if (!user) return res.status(404).json({ message: "User not found" })

    const whatsappSafe = user.whatsapp
      ? { connected: user.whatsapp.connected, phoneNumberId: user.whatsapp.phoneNumberId || null }
      : { connected: false, phoneNumberId: null }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        whatsapp: whatsappSafe,
        aiSettings: user.aiSettings,
        createdAt: user.createdAt,
      },
    })
  } catch (err) {
    console.error("Me error:", err)
    res.status(500).json({ message: "Failed to get user" })
  }
})

app.patch("/api/users/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ message: "User not found" })

    const { name, aiSettings, whatsapp } = req.body || {}
    if (name !== undefined) user.name = name
    if (aiSettings !== undefined) {
      if (aiSettings.businessName !== undefined) user.aiSettings.businessName = aiSettings.businessName
      if (aiSettings.product !== undefined) user.aiSettings.product = aiSettings.product
      if (aiSettings.price !== undefined) user.aiSettings.price = aiSettings.price
      if (aiSettings.tone !== undefined) user.aiSettings.tone = aiSettings.tone
      if (aiSettings.languageMode !== undefined) user.aiSettings.languageMode = aiSettings.languageMode
    }
    if (whatsapp !== undefined) {
      if (whatsapp.phoneNumberId !== undefined) user.whatsapp.phoneNumberId = whatsapp.phoneNumberId
      if (whatsapp.connected !== undefined) user.whatsapp.connected = whatsapp.connected
    }

    await user.save()
    const out = await User.findById(user._id).select("-password -resetPasswordToken -resetPasswordExpires")
    res.json({
      user: {
        id: out._id,
        name: out.name,
        email: out.email,
        role: out.role,
        plan: out.plan,
        whatsapp: { connected: !!out.whatsapp?.connected, phoneNumberId: out.whatsapp?.phoneNumberId || null },
        aiSettings: out.aiSettings,
        createdAt: out.createdAt,
      },
    })
  } catch (err) {
    console.error("Update me error:", err)
    res.status(500).json({ message: "Failed to update profile" })
  }
})

app.get("/api/users/me/stats", auth, async (req, res) => {
  res.json({ messagesProcessed: 0, activeVideoAds: 0, products: 0, services: 0 })
})

// ---- Admin ----
app.get("/api/admin/stats", auth, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()
    const beta = await User.countDocuments({ plan: "beta" })
    const premium = await User.countDocuments({ plan: "premium" })
    const enterprise = await User.countDocuments({ plan: "enterprise" })
    const activeSubscriptions = beta + premium + enterprise
    const mrr = premium * 50 + enterprise * 200

    res.json({ totalUsers, activeSubscriptions, mrr, supportOpen: 0, plans: { beta, premium, enterprise }, currency: "SAR" })
  } catch (err) {
    console.error("Admin stats error:", err)
    res.status(500).json({ message: "Failed to load stats." })
  }
})

app.get("/api/admin/users", auth, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query || {}
    const limitNum = Math.min(Number(limit) || 10, 100)
    const pageNum = Math.max(Number(page) || 1, 1)
    const skip = (pageNum - 1) * limitNum

    const q = {}
    if (search) {
      q.$or = [
        { name: { $regex: String(search), $options: "i" } },
        { email: { $regex: String(search), $options: "i" } },
      ]
    }

    const [users, total] = await Promise.all([
      User.find(q)
        .select("-password -resetPasswordToken -resetPasswordExpires")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(q),
    ])

    res.json({
      users: users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        plan: u.plan,
        createdAt: u.createdAt,
        status: "Active",
      })),
      total,
      page: pageNum,
      limit: limitNum,
    })
  } catch (err) {
    console.error("Admin users list error:", err)
    res.status(500).json({ message: "Failed to load users." })
  }
})

// ---- DB connect + start ----
const mongoUri = process.env.MONGODB_URI
if (!mongoUri) {
  console.error("MONGODB_URI missing in .env")
  process.exit(1)
}

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("Connected to MongoDB")
    const port = Number(process.env.PORT) || 5000
    server.listen(port, () => console.log(`Server is running on port ${port}`))
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err?.message || err)
    process.exit(1)
  })

dotenv.config()

const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")

const User = require("./models/User")
const Notification = require("./models/Notification")
const { sendPasswordResetEmail } = require("./services/email")
const { auth, adminOnly } = require("./middleware/auth")

const productRoutes = require("./routes/products")
const serviceRoutes = require("./routes/services")
const uploadRoutes = require("./routes/uploads")
const notificationRoutes = require("./routes/notifications")
const whatsappRoutes = require("./routes/whatsapp")
const twilioWebhooksRoutes = require("./routes/twilioWebhooks")
const whatsappController = require("./controllers/whatsappController")

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
})

app.use(cors())
app.use(express.json({ limit: "10mb" }))

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Waseel backend foundation is running" })
})

// Routes
app.use("/api/products", productRoutes)
app.use("/api/services", serviceRoutes)
app.use("/api/uploads", uploadRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/whatsapp", whatsappRoutes)

// Meta WhatsApp webhook (public)
app.get("/api/webhooks/whatsapp", whatsappController.webhookVerify)
app.post("/api/webhooks/whatsapp", whatsappController.webhookReceive)

// Twilio inbound WhatsApp webhook (public)
app.use("/api/webhooks/twilio", twilioWebhooksRoutes)

// ---- Auth ----
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, role = "client", plan = "beta", whatsapp = {}, aiSettings = {} } = req.body || {}
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required." })
    }

    const existing = await User.findOne({ email: String(email).toLowerCase() })
    if (existing) return res.status(409).json({ message: "An account with this email already exists." })

    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)

    const user = await User.create({
      name,
      email: String(email).toLowerCase(),
      password: hash,
      role,
      plan,
      whatsapp,
      aiSettings,
      authProvider: "email",
    })

    // welcome notification
    try {
      await Notification.create({
        userId: user._id,
        title: "Welcome to Waseel AI",
        message: "Your account has been created successfully.",
        type: "success",
      })
    } catch (_) {}

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, plan: user.plan },
      process.env.JWT_SECRET || "change-me",
      { expiresIn: "7d" }
    )

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        whatsapp: { connected: !!user.whatsapp?.connected, phoneNumberId: user.whatsapp?.phoneNumberId || null },
        aiSettings: user.aiSettings,
        createdAt: user.createdAt,
      },
      token,
    })
  } catch (err) {
    console.error("Signup error:", err)
    res.status(500).json({ message: "Failed to create account." })
  }
})

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." })

    const user = await User.findOne({ email: String(email).toLowerCase() })
    if (!user || user.authProvider !== "email") {
      return res.status(401).json({ message: "Invalid email or password." })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password." })

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, plan: user.plan },
      process.env.JWT_SECRET || "change-me",
      { expiresIn: "7d" }
    )

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        whatsapp: { connected: !!user.whatsapp?.connected, phoneNumberId: user.whatsapp?.phoneNumberId || null },
        aiSettings: user.aiSettings,
        createdAt: user.createdAt,
      },
      token,
    })
  } catch (err) {
    console.error("Login error:", err)
    res.status(500).json({ message: "Failed to log in." })
  }
})

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {}
    if (!email) return res.status(400).json({ message: "Email is required." })

    const user = await User.findOne({ email: String(email).toLowerCase(), authProvider: "email" })
    if (!user) {
      return res.json({ message: "If that email exists, a reset link has been sent." })
    }

    const rawToken = crypto.randomBytes(32).toString("hex")
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex")

    user.resetPasswordToken = hashedToken
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000)
    await user.save()

    await sendPasswordResetEmail(user.email, rawToken)

    return res.json({ message: "If that email exists, a reset link has been sent." })
  } catch (err) {
    console.error("Forgot password error:", err)
    res.status(500).json({ message: "Failed to start password reset." })
  }
})

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body || {}
    if (!token || !password) return res.status(400).json({ message: "Token and new password are required." })

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    })
    if (!user) return res.status(400).json({ message: "Reset token is invalid or has expired." })

    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(password, salt)
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined
    await user.save()

    // notification
    try {
      await Notification.create({
        userId: user._id,
        title: "Password updated",
        message: "Your password was changed successfully.",
        type: "success",
      })
    } catch (_) {}

    res.json({ message: "Password has been reset successfully." })
  } catch (err) {
    console.error("Reset password error:", err)
    res.status(500).json({ message: "Failed to reset password." })
  }
})

app.get("/api/auth/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -resetPasswordToken -resetPasswordExpires")
    if (!user) return res.status(404).json({ message: "User not found" })

    const whatsappSafe = user.whatsapp
      ? { connected: user.whatsapp.connected, phoneNumberId: user.whatsapp.phoneNumberId || null }
      : { connected: false, phoneNumberId: null }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        whatsapp: whatsappSafe,
        aiSettings: user.aiSettings,
        createdAt: user.createdAt,
      },
    })
  } catch (err) {
    console.error("Me error:", err)
    res.status(500).json({ message: "Failed to get user" })
  }
})

app.patch("/api/users/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ message: "User not found" })

    const { name, aiSettings, whatsapp } = req.body || {}
    if (name !== undefined) user.name = name
    if (aiSettings !== undefined) {
      if (aiSettings.businessName !== undefined) user.aiSettings.businessName = aiSettings.businessName
      if (aiSettings.product !== undefined) user.aiSettings.product = aiSettings.product
      if (aiSettings.price !== undefined) user.aiSettings.price = aiSettings.price
      if (aiSettings.tone !== undefined) user.aiSettings.tone = aiSettings.tone
      if (aiSettings.languageMode !== undefined) user.aiSettings.languageMode = aiSettings.languageMode
    }
    if (whatsapp !== undefined) {
      if (whatsapp.phoneNumberId !== undefined) user.whatsapp.phoneNumberId = whatsapp.phoneNumberId
      if (whatsapp.connected !== undefined) user.whatsapp.connected = whatsapp.connected
    }

    await user.save()
    const out = await User.findById(user._id).select("-password -resetPasswordToken -resetPasswordExpires")
    res.json({
      user: {
        id: out._id,
        name: out.name,
        email: out.email,
        role: out.role,
        plan: out.plan,
        whatsapp: { connected: !!out.whatsapp?.connected, phoneNumberId: out.whatsapp?.phoneNumberId || null },
        aiSettings: out.aiSettings,
        createdAt: out.createdAt,
      },
    })
  } catch (err) {
    console.error("Update me error:", err)
    res.status(500).json({ message: "Failed to update profile" })
  }
})

app.get("/api/users/me/stats", auth, async (req, res) => {
  res.json({ messagesProcessed: 0, activeVideoAds: 0, products: 0, services: 0 })
})

// ---- Admin ----
app.get("/api/admin/stats", auth, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()
    const beta = await User.countDocuments({ plan: "beta" })
    const premium = await User.countDocuments({ plan: "premium" })
    const enterprise = await User.countDocuments({ plan: "enterprise" })

    const activeSubscriptions = beta + premium + enterprise
    const mrr = premium * 50 + enterprise * 200

    res.json({
      totalUsers,
      activeSubscriptions,
      mrr,
      supportOpen: 0,
      plans: { beta, premium, enterprise },
      currency: "SAR",
    })
  } catch (err) {
    console.error("Admin stats error:", err)
    res.status(500).json({ message: "Failed to load stats." })
  }
})

app.get("/api/admin/users", auth, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query || {}
    const limitNum = Math.min(Number(limit) || 10, 100)
    const pageNum = Math.max(Number(page) || 1, 1)
    const skip = (pageNum - 1) * limitNum

    const q = {}
    if (search) {
      q.$or = [
        { name: { $regex: String(search), $options: "i" } },
        { email: { $regex: String(search), $options: "i" } },
      ]
    }

    const [users, total] = await Promise.all([
      User.find(q).select("-password -resetPasswordToken -resetPasswordExpires").sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      User.countDocuments(q),
    ])

    res.json({
      users: users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        plan: u.plan,
        createdAt: u.createdAt,
        status: "Active",
      })),
      total,
      page: pageNum,
      limit: limitNum,
    })
  } catch (err) {
    console.error("Admin users list error:", err)
    res.status(500).json({ message: "Failed to load users." })
  }
})

// ---- DB connect + start ----
const mongoUri = process.env.MONGODB_URI
if (!mongoUri) {
  console.error("MONGODB_URI missing in .env")
  process.exit(1)
}

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("Connected to MongoDB")
    const port = Number(process.env.PORT) || 5000
    server.listen(port, () => {
      console.log(`Server is running on port ${port}`)
    })
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err?.message || err)
    process.exit(1)
  })

const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const mongoose = require("mongoose")
const cors = require("cors")
const dotenv = require("dotenv")

dotenv.config()

const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const User = require("./models/User")
const Notification = require("./models/Notification")
const { sendPasswordResetEmail } = require("./services/email")
const { auth, adminOnly } = require("./middleware/auth")
const productRoutes = require("./routes/products")
const serviceRoutes = require("./routes/services")
const whatsappRoutes = require("./routes/whatsapp")
const twilioWebhooksRoutes = require("./routes/twilioWebhooks")

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

// Middleware
app.use(cors())
// Allow base64 image payloads for Cloudinary upload
app.use(express.json({ limit: "10mb" }))

// Basic health check (no real routes yet)
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Waseel backend foundation is running" })
})

// Product routes (auth required, scoped by user)
app.use("/api/products", productRoutes)

// Service routes (auth required, scoped by user)
app.use("/api/services", serviceRoutes)

// Upload routes (auth required)
app.use("/api/uploads", require("./routes/uploads"))

// WhatsApp AI routes (auth required)
app.use("/api/whatsapp", whatsappRoutes)

// WhatsApp webhook (public; called by Meta for verification and incoming messages)
const whatsappController = require("./controllers/whatsappController")
app.get("/api/webhooks/whatsapp", whatsappController.webhookVerify)
app.post("/api/webhooks/whatsapp", whatsappController.webhookReceive)

// Twilio webhooks (public; called by Twilio for inbound WhatsApp)
app.use("/api/webhooks/twilio", twilioWebhooksRoutes)

// Auth routes
app.post("/api/auth/signup", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = "client",
      plan = "beta",
      whatsapp = {},
      aiSettings = {}
    } = req.body || {}

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required." })
    }

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." })
    }

    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hash,
      role,
      plan,
      whatsapp,
      aiSettings,
      authProvider: "email"
    })

    await Notification.create({
      userId: user._id,
      title: "Welcome to Waseel",
      message: "Your account has been created. Complete your business profile in Settings to get started.",
      type: "system"
    })

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        plan: user.plan
      },
      process.env.JWT_SECRET || "change-me",
      { expiresIn: "7d" }
    )

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        whatsapp: user.whatsapp,
        aiSettings: user.aiSettings,
        createdAt: user.createdAt
      },
      token
    })
  } catch (err) {
    console.error("Signup error:", err)
    res.status(500).json({ message: "Failed to create account." })
  }
})

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {}

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." })
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." })
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        plan: user.plan
      },
      process.env.JWT_SECRET || "change-me",
      { expiresIn: "7d" }
    )

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        whatsapp: user.whatsapp,
        aiSettings: user.aiSettings,
        createdAt: user.createdAt
      },
      token
    })
  } catch (err) {
    console.error("Login error:", err)
    res.status(500).json({ message: "Failed to log in." })
  }
})

// Google auth: create or log in user
app.post("/api/auth/google", async (req, res) => {
  try {
    const { googleId, email, name, picture, plan = "beta" } = req.body || {}

    if (!googleId || !email) {
      return res.status(400).json({ message: "googleId and email are required." })
    }

    let user = await User.findOne({ googleId })
    if (!user) {
      user = await User.findOne({ email: email.toLowerCase() })
    }

    if (user) {
      user.googleId = user.googleId || googleId
      if (name) user.name = name
      if (!user.plan) user.plan = plan
      await user.save()
    } else {
      user = await User.create({
        name: name || email,
        email: email.toLowerCase(),
        authProvider: "google",
        googleId,
        plan,
        // whatsapp/aiSettings use defaults
      })
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        plan: user.plan
      },
      process.env.JWT_SECRET || "change-me",
      { expiresIn: "7d" }
    )

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        whatsapp: user.whatsapp,
        aiSettings: user.aiSettings,
        createdAt: user.createdAt
      },
      token
    })
  } catch (err) {
    console.error("Google auth error:", err)
    res.status(500).json({ message: "Failed to authenticate with Google." })
  }
})

// Forgot / reset password
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {}
    if (!email) {
      return res.status(400).json({ message: "Email is required." })
    }

    const user = await User.findOne({ email: email.toLowerCase(), authProvider: "email" })
    if (!user) {
      // Don't leak which emails exist
      return res.json({ message: "If that email exists, a reset link has been sent." })
    }

    const rawToken = crypto.randomBytes(32).toString("hex")
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex")

    user.resetPasswordToken = hashedToken
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    await user.save()

    await sendPasswordResetEmail(user.email, rawToken)

    return res.json({
      message: "If that email exists, a reset link has been sent."
    })
  } catch (err) {
    console.error("Forgot password error:", err)
    res.status(500).json({ message: "Failed to start password reset." })
  }
})

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body || {}

    if (!token || !password) {
      return res.status(400).json({ message: "Token and new password are required." })
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    })

    if (!user) {
      return res.status(400).json({ message: "Reset token is invalid or has expired." })
    }

    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(password, salt)
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined

    await user.save()

    await Notification.create({
      userId: user._id,
      title: "Password reset",
      message: "Your password was changed successfully. If you did not do this, please secure your account.",
      type: "system"
    })

    res.json({ message: "Password has been reset successfully." })
  } catch (err) {
    console.error("Reset password error:", err)
    res.status(500).json({ message: "Failed to reset password." })
  }
})

// Admin stats (requires auth + admin role)
app.get("/api/admin/stats", auth, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()

    const planCounts = await User.aggregate([
      { $match: { plan: { $in: ["beta", "premium", "enterprise"] } } },
      { $group: { _id: "$plan", count: { $sum: 1 } } },
    ])
    const plans = { beta: 0, premium: 0, enterprise: 0 }
    planCounts.forEach((p) => {
      plans[p._id] = p.count
    })

    const activeSubscriptions = plans.beta + plans.premium + plans.enterprise
    // Placeholder MRR: e.g. premium 50 SAR, enterprise 200 SAR per month (beta = 0)
    const mrr = plans.premium * 50 + plans.enterprise * 200
    const supportOpen = 0 // No support model yet

    res.json({
      totalUsers,
      activeSubscriptions,
      mrr,
      supportOpen,
      plans,
    })
  } catch (err) {
    console.error("Admin stats error:", err)
    res.status(500).json({ message: "Failed to load admin stats." })
  }
})

// Admin list users (requires auth + admin role)
app.get("/api/admin/users", auth, adminOnly, async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query || {}
    const skip = Math.max(0, (Number(page) || 1) - 1) * Math.min(50, Math.max(1, Number(limit) || 20))
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 20))

    const filter = {}
    if (search && String(search).trim()) {
      const term = String(search).trim().toLowerCase()
      filter.$or = [
        { email: { $regex: term, $options: "i" } },
        { name: { $regex: term, $options: "i" } },
        { plan: { $regex: term, $options: "i" } },
      ]
    }

    const [users, total] = await Promise.all([
      User.find(filter).select("-password -resetPasswordToken -resetPasswordExpires").sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      User.countDocuments(filter),
    ])

    res.json({
      users: users.map((u) => ({
        id: u._id,
        email: u.email,
        name: u.name,
        plan: u.plan,
        role: u.role,
        createdAt: u.createdAt,
        status: "Active",
      })),
      total,
      page: Number(page) || 1,
      limit: limitNum,
    })
  } catch (err) {
    console.error("Admin users list error:", err)
    res.status(500).json({ message: "Failed to load users." })
  }
})

// Get current user (requires valid JWT)
app.get("/api/auth/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -resetPasswordToken -resetPasswordExpires")
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }
    // Never send accessToken to frontend
    const whatsappSafe = user.whatsapp
      ? { connected: user.whatsapp.connected, phoneNumberId: user.whatsapp.phoneNumberId || null }
      : { connected: false, phoneNumberId: null }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        whatsapp: whatsappSafe,
        aiSettings: user.aiSettings,
        createdAt: user.createdAt
      }
    })
  } catch (err) {
    console.error("Me error:", err)
    res.status(500).json({ message: "Failed to get user" })
  }
})

// Update current user profile (name, aiSettings, etc.)
app.patch("/api/users/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ message: "User not found" })

    const { name, aiSettings, whatsapp } = req.body || {}
    if (name !== undefined) user.name = name
    if (aiSettings !== undefined) {
      if (aiSettings.businessName !== undefined) user.aiSettings.businessName = aiSettings.businessName
      if (aiSettings.product !== undefined) user.aiSettings.product = aiSettings.product
      if (aiSettings.price !== undefined) user.aiSettings.price = aiSettings.price
      if (aiSettings.tone !== undefined) user.aiSettings.tone = aiSettings.tone
      if (aiSettings.languageMode !== undefined) user.aiSettings.languageMode = aiSettings.languageMode
    }
    if (whatsapp !== undefined) {
      if (whatsapp.phoneNumberId !== undefined) user.whatsapp.phoneNumberId = whatsapp.phoneNumberId
      if (whatsapp.connected !== undefined) user.whatsapp.connected = whatsapp.connected
    }

    await user.save()
    const out = await User.findById(user._id).select("-password -resetPasswordToken -resetPasswordExpires")
    res.json({
      user: {
        id: out._id,
        name: out.name,
        email: out.email,
        role: out.role,
        plan: out.plan,
        whatsapp: out.whatsapp,
        aiSettings: out.aiSettings,
        createdAt: out.createdAt
      }
    })
  } catch (err) {
    console.error("Update me error:", err)
    res.status(500).json({ message: "Failed to update profile" })
  }
})

// User dashboard stats (placeholder; wire to real metrics later)
app.get("/api/users/me/stats", auth, async (req, res) => {
  try {
    // Placeholder: in future aggregate from messages/ads/leads collections
    res.json({
      messagesProcessed: 0,
      activeVideoAds: 0,
      salesImpact: 0,
      newLeads: 0,
      chartData: []
    })
  } catch (err) {
    console.error("User stats error:", err)
    res.status(500).json({ message: "Failed to load stats" })
  }
})

// Notifications: list for current user
app.get("/api/notifications", auth, async (req, res) => {
  try {
    const list = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
    const unreadCount = await Notification.countDocuments({ userId: req.user.id, read: false })
    res.json({ notifications: list, unreadCount })
  } catch (err) {
    console.error("Notifications list error:", err)
    res.status(500).json({ message: "Failed to load notifications" })
  }
})

// Mark notification as read
app.patch("/api/notifications/:id/read", auth, async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    )
    if (!n) return res.status(404).json({ message: "Notification not found" })
    res.json({ notification: n })
  } catch (err) {
    console.error("Mark read error:", err)
    res.status(500).json({ message: "Failed to update" })
  }
})

// Admin: create notification for a user (system notifications)
app.post("/api/notifications", auth, adminOnly, async (req, res) => {
  try {
    const { userId, title, message, type = "info" } = req.body || {}
    if (!userId || !title || !message) {
      return res.status(400).json({ message: "userId, title, and message are required." })
    }
    const notification = await Notification.create({
      userId,
      title,
      message,
      type: ["info", "success", "warning", "system"].includes(type) ? type : "info"
    })
    res.status(201).json({ notification })
  } catch (err) {
    console.error("Create notification error:", err)
    res.status(500).json({ message: "Failed to create notification" })
  }
})

// MongoDB connection and verification
const mongoUri = process.env.MONGODB_URI
if (!mongoUri) {
  console.warn("MONGODB_URI is not set in .env")
}

// Database verification endpoint
app.get("/api/db/verify", async (req, res) => {
  try {
    const state = mongoose.connection.readyState
    // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    if (state !== 1) {
      return res.status(503).json({
        ok: false,
        database: "MongoDB",
        status: state === 0 ? "disconnected" : state === 2 ? "connecting" : "disconnecting",
        message: "Database is not ready"
      })
    }
    // Ping to confirm we can run a command
    await mongoose.connection.db.admin().ping()
    res.json({
      ok: true,
      database: "MongoDB",
      status: "connected",
      message: "Database connection verified successfully"
    })
  } catch (err) {
    res.status(503).json({
      ok: false,
      database: "MongoDB",
      status: "error",
      message: err.message || "Database verification failed"
    })
  }
})

async function connectDatabase() {
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set in .env")
  }
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000, // 10s timeout
    family: 4,                        // Force IPv4 — fixes Windows DNS/SRV issues
  })
  console.log("Connected to MongoDB")
}

connectDatabase()
  .then(() => {
    const PORT = process.env.PORT || 5000
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message)
    console.error("Troubleshooting tips:")
    console.error("  1. Check Atlas Network Access — whitelist 0.0.0.0/0 for dev")
    console.error("  2. Make sure your cluster is not paused in Atlas dashboard")
    console.error("  3. Try replacing mongodb+srv:// with a standard connection string")
    console.error("  4. Run: nslookup _mongodb._tcp.backenddb.stmxlhb.mongodb.net 8.8.8.8")
    process.exit(1)
  })

// Socket.io basic connection handler
io.on("connection", (socket) => {
  console.log("New client connected", socket.id)

  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id)
  })
})