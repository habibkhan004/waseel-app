const Service = require("../models/Service")

async function getAll(req, res) {
  try {
    const list = await Service.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean()
    res.json({ services: list })
  } catch (err) {
    console.error("Services getAll error:", err)
    res.status(500).json({ message: "Failed to load services." })
  }
}

async function getOne(req, res) {
  try {
    const service = await Service.findOne({ _id: req.params.id, userId: req.user.id }).lean()
    if (!service) return res.status(404).json({ message: "Service not found." })
    res.json({ service })
  } catch (err) {
    console.error("Services getOne error:", err)
    res.status(500).json({ message: "Failed to load service." })
  }
}

async function create(req, res) {
  try {
    const { name, description = "", category, price, currency = "SAR", availability = true } = req.body || {}
    if (!name || !category || price === undefined) {
      return res.status(400).json({ message: "name, category and price are required." })
    }

    const service = await Service.create({
      userId: req.user.id,
      name,
      description,
      category,
      price: String(price),
      currency: String(currency || "SAR"),
      availability: !!availability,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    res.status(201).json({ service })
  } catch (err) {
    console.error("Services create error:", err)
    res.status(500).json({ message: "Failed to create service." })
  }
}

async function update(req, res) {
  try {
    const service = await Service.findOne({ _id: req.params.id, userId: req.user.id })
    if (!service) return res.status(404).json({ message: "Service not found." })

    const { name, description, category, price, currency, availability } = req.body || {}
    if (name !== undefined) service.name = name
    if (description !== undefined) service.description = description
    if (category !== undefined) service.category = category
    if (price !== undefined) service.price = String(price)
    if (currency !== undefined) service.currency = String(currency)
    if (availability !== undefined) service.availability = !!availability

    service.updatedAt = new Date()
    await service.save()
    res.json({ service })
  } catch (err) {
    console.error("Services update error:", err)
    res.status(500).json({ message: "Failed to update service." })
  }
}

async function remove(req, res) {
  try {
    const service = await Service.findOne({ _id: req.params.id, userId: req.user.id })
    if (!service) return res.status(404).json({ message: "Service not found." })

    await Service.deleteOne({ _id: service._id })
    res.json({ ok: true })
  } catch (err) {
    console.error("Services remove error:", err)
    res.status(500).json({ message: "Failed to delete service." })
  }
}

module.exports = { getAll, getOne, create, update, remove }

