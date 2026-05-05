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
const Product = require("./models/Product")
const Service = require("./models/Service")
const WhatsappMessage = require("./models/WhatsappMessage")
const { sendPasswordResetEmail } = require("./services/email")
const { auth, adminOnly } = require("./middleware/auth")

const productRoutes = require("./routes/products")
const storeRoutes = require("./routes/stores")
const serviceRoutes = require("./routes/services")
const uploadRoutes = require("./routes/uploads")
const notificationRoutes = require("./routes/notifications")
const whatsappRoutes = require("./routes/whatsapp")
const whatsappController = require("./controllers/whatsappController")
const evolutionAutoReply = require("./services/evolutionAutoReply")

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
app.use("/api/stores", storeRoutes)
app.use("/api/services", serviceRoutes)
app.use("/api/uploads", uploadRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/whatsapp", whatsappRoutes)

// Meta WhatsApp webhook (public)
app.get("/api/webhooks/whatsapp", whatsappController.webhookVerify)
app.post("/api/webhooks/whatsapp", whatsappController.webhookReceive)

// Whapi inbound webhook (public)
// (Removed) Whapi Cloud integration migrated to Evolution API.

// Evolution API — optional webhook: POST /api/webhooks/evolution when EVOLUTION_AUTO_REPLY_TRANSPORT=webhook
evolutionAutoReply.registerWebhookRoutes(app)

// ---- Auth ----
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, role = "client", plan = "beta", whatsapp = {}, aiSettings = {} } = req.body || {}
    if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password are required." })

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
    if (!user || user.authProvider !== "email") return res.status(401).json({ message: "Invalid email or password." })

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

// Google auth: create or log in user
app.post("/api/auth/google", async (req, res) => {
  try {
    const { googleId, email, name, plan = "beta" } = req.body || {}
    if (!googleId || !email) {
      return res.status(400).json({ message: "googleId and email are required." })
    }

    const normalizedEmail = String(email).toLowerCase()
    let user = await User.findOne({ $or: [{ googleId }, { email: normalizedEmail }] })

    if (user) {
      user.googleId = user.googleId || googleId
      user.authProvider = "google"
      if (name) user.name = name
      if (!user.plan) user.plan = plan
      await user.save()
    } else {
      user = await User.create({
        name: name || normalizedEmail,
        email: normalizedEmail,
        authProvider: "google",
        googleId,
        plan,
      })
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, plan: user.plan },
      process.env.JWT_SECRET || "change-me",
      { expiresIn: "7d" }
    )

    return res.json({
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
    console.error("Google auth error:", err)
    return res.status(500).json({ message: "Failed to authenticate with Google." })
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
    res.json({ message: "If that email exists, a reset link has been sent." })
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
    const user = await User.findOne({ resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: new Date() } })
    if (!user) return res.status(400).json({ message: "Reset token is invalid or has expired." })

    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(password, salt)
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined
    await user.save()

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
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id)
    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    const startOfWeekWindow = new Date(startOfToday)
    startOfWeekWindow.setDate(startOfWeekWindow.getDate() - 6)

    const [products, services, messagesProcessed, outboundToday, uniqueLeads] = await Promise.all([
      Product.countDocuments({ userId }),
      Service.countDocuments({ userId }),
      WhatsappMessage.countDocuments({ userId, createdAt: { $gte: startOfToday } }),
      WhatsappMessage.countDocuments({ userId, direction: "outbound", createdAt: { $gte: startOfToday } }),
      WhatsappMessage.distinct("from", { userId, direction: "inbound", createdAt: { $gte: startOfWeekWindow } }),
    ])

    const weeklyRaw = await WhatsappMessage.aggregate([
      { $match: { userId, createdAt: { $gte: startOfWeekWindow } } },
      {
        $group: {
          _id: { day: { $dayOfWeek: "$createdAt" } },
          messages: { $sum: 1 },
          replies: { $sum: { $cond: [{ $eq: ["$direction", "outbound"] }, 1, 0] } },
        },
      },
    ])

    const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const weeklyByDay = new Map(weeklyRaw.map((d) => [Number(d?._id?.day || 0), d]))
    const chartData = dayMap.map((name, i) => {
      const dayOfWeek = i + 1
      const item = weeklyByDay.get(dayOfWeek)
      return {
        name,
        messages: Number(item?.messages || 0),
        replies: Number(item?.replies || 0),
      }
    })

    const recentRows = await WhatsappMessage.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()

    const recentConversations = recentRows.map((m) => {
      const display = String(m.from || m.to || "Customer")
      const digits = display.replace(/\D/g, "")
      const label = digits ? `+${digits.slice(-10)}` : display.slice(0, 24)
      return {
        name: label || "Customer",
        msg: m.body || `[${m.messageType || "message"}]`,
        type: m.messageType || "text",
        direction: m.direction || "inbound",
        createdAt: m.createdAt,
      }
    })

    return res.json({
      messagesProcessed,
      activeVideoAds: 0,
      salesImpact: outboundToday * 15,
      newLeads: uniqueLeads.length,
      products,
      services,
      chartData,
      recentConversations,
    })
  } catch (err) {
    console.error("User stats error:", err)
    return res.status(500).json({ message: "Failed to load stats." })
  }
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
      User.find(q).select("-password -resetPasswordToken -resetPasswordExpires").sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      User.countDocuments(q),
    ])

    res.json({
      users: users.map((u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, plan: u.plan, createdAt: u.createdAt, status: "Active" })),
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
      // Start Evolution-based auto-reply worker (polling).
      try {
        require("./services/evolutionAutoReply").start()
      } catch (e) {
        console.error("Failed to start evolution auto-reply worker:", e?.message || e)
      }
    })
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err?.message || err)
    process.exit(1)
  })

