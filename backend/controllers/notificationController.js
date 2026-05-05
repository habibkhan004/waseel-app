const Notification = require("../models/Notification")

async function list(req, res) {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
    res.json({ notifications })
  } catch (err) {
    console.error("Notifications list error:", err)
    res.status(500).json({ message: "Failed to load notifications." })
  }
}

async function markRead(req, res) {
  try {
    const n = await Notification.findOne({ _id: req.params.id, userId: req.user.id })
    if (!n) return res.status(404).json({ message: "Notification not found." })
    n.read = true
    await n.save()
    res.json({ ok: true })
  } catch (err) {
    console.error("Notifications markRead error:", err)
    res.status(500).json({ message: "Failed to mark notification as read." })
  }
}

async function markAllRead(req, res) {
  try {
    await Notification.updateMany({ userId: req.user.id, read: false }, { $set: { read: true } })
    res.json({ ok: true })
  } catch (err) {
    console.error("Notifications markAllRead error:", err)
    res.status(500).json({ message: "Failed to mark all notifications as read." })
  }
}

module.exports = { list, markRead, markAllRead }

