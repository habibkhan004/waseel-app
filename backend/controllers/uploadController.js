const cloudinary = require("../services/cloudinary")

function isDataUrl(str) {
  return typeof str === "string" && /^data:image\/[a-zA-Z]+;base64,/.test(str)
}

async function uploadImage(req, res) {
  try {
    const { dataUrl, folder = "waseel" } = req.body || {}
    if (!dataUrl || !isDataUrl(dataUrl)) {
      return res.status(400).json({ message: "dataUrl (base64 data URI) is required." })
    }

    if (!cloudinary?.config?.cloud_name) {
      return res.status(500).json({ message: "Cloudinary not configured." })
    }

    const result = await cloudinary.uploader.upload(dataUrl, { folder })
    return res.json({ url: result.secure_url, publicId: result.public_id })
  } catch (err) {
    console.error("Upload image error:", err)
    return res.status(500).json({ message: "Failed to upload image." })
  }
}

module.exports = { uploadImage }

