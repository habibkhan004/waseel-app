const Product = require("../models/Product")
const cloudinary = require("../services/cloudinary")

function isDataUrlImage(str) {
  return typeof str === "string" && /^data:image\/[a-zA-Z]+;base64,/.test(str)
}

async function ensureImage({ image, publicId }) {
  if (!image) return { image: "", publicId: "" }
  if (!isDataUrlImage(image)) {
    return { image, publicId: publicId || "" }
  }
  if (!cloudinary?.config?.cloud_name) {
    throw new Error("Cloudinary not configured.")
  }
  const result = await cloudinary.uploader.upload(image, { folder: "waseel/products" })
  return { image: result.secure_url, publicId: result.public_id }
}

async function getAll(req, res) {
  try {
    const list = await Product.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean()
    res.json({ products: list })
  } catch (err) {
    console.error("Products getAll error:", err)
    res.status(500).json({ message: "Failed to load products." })
  }
}

async function getOne(req, res) {
  try {
    const product = await Product.findOne({ _id: req.params.id, userId: req.user.id }).lean()
    if (!product) return res.status(404).json({ message: "Product not found." })
    res.json({ product })
  } catch (err) {
    console.error("Products getOne error:", err)
    res.status(500).json({ message: "Failed to load product." })
  }
}

async function create(req, res) {
  try {
    const { name, description = "", category = "", price, currency = "SAR", stock = 0, image = "", publicId = "" } = req.body || {}
    if (!name || price === undefined) return res.status(400).json({ message: "name and price are required." })

    const img = await ensureImage({ image, publicId })

    const product = await Product.create({
      userId: req.user.id,
      name,
      description,
      category,
      price: String(price),
      currency: String(currency || "SAR"),
      stock: Number(stock) || 0,
      image: img.image,
      publicId: img.publicId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    res.status(201).json({ product })
  } catch (err) {
    console.error("Products create error:", err)
    res.status(500).json({ message: err?.message || "Failed to create product." })
  }
}

async function update(req, res) {
  try {
    const product = await Product.findOne({ _id: req.params.id, userId: req.user.id })
    if (!product) return res.status(404).json({ message: "Product not found." })

    if (product.source && product.source !== "manual") {
      return res.status(409).json({
        message: "This product is synced from a connected store. Edit it in Shopify or WooCommerce, then run sync again.",
      })
    }

    const { name, description, category, price, currency, stock, image, publicId } = req.body || {}
    if (name !== undefined) product.name = name
    if (description !== undefined) product.description = description
    if (category !== undefined) product.category = category
    if (price !== undefined) product.price = String(price)
    if (currency !== undefined) product.currency = String(currency)
    if (stock !== undefined) product.stock = Number(stock) || 0

    if (image !== undefined) {
      // if uploading new base64 image, delete old cloudinary
      if (isDataUrlImage(image) && product.publicId && cloudinary?.uploader) {
        try {
          await cloudinary.uploader.destroy(product.publicId)
        } catch (_) {}
      }
      const img = await ensureImage({ image, publicId })
      product.image = img.image
      product.publicId = img.publicId
    }

    product.updatedAt = new Date()
    await product.save()
    res.json({ product })
  } catch (err) {
    console.error("Products update error:", err)
    res.status(500).json({ message: err?.message || "Failed to update product." })
  }
}

async function remove(req, res) {
  try {
    const product = await Product.findOne({ _id: req.params.id, userId: req.user.id })
    if (!product) return res.status(404).json({ message: "Product not found." })

    if (product.publicId && cloudinary?.uploader) {
      try {
        await cloudinary.uploader.destroy(product.publicId)
      } catch (err) {
        console.warn("Cloudinary destroy failed:", err?.message || err)
      }
    }

    await Product.deleteOne({ _id: product._id })
    res.json({ ok: true })
  } catch (err) {
    console.error("Products remove error:", err)
    res.status(500).json({ message: "Failed to delete product." })
  }
}

module.exports = { getAll, getOne, create, update, remove }

