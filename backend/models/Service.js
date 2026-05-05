const mongoose = require("mongoose")

const serviceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    category: { type: String, required: true, trim: true },
    price: { type: String, required: true, trim: true },
    currency: { type: String, default: "SAR", trim: true },
    availability: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
)

module.exports = mongoose.model("Service", serviceSchema)

