const jwt = require("jsonwebtoken")

function auth(req, res, next) {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token) return res.status(401).json({ message: "Unauthorized" })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "change-me")
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" })
  }
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: admin access required" })
  }
  next()
}

module.exports = { auth, adminOnly }

