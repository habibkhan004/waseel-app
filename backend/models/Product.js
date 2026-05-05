const mongoose = require("mongoose")

const productSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    image: { type: String, default: "" },
    publicId: { type: String, default: "" },
    category: { type: String, default: "", trim: true },
    price: { type: String, required: true, trim: true },
    currency: { type: String, default: "SAR", trim: true },
    stock: { type: Number, default: 0 },
    source: { type: String, enum: ["manual", "shopify", "woocommerce", "custom_website"], default: "manual" },
    storeConnectionId: { type: mongoose.Schema.Types.ObjectId, ref: "StoreConnection", default: null },
    externalId: { type: String, default: "", trim: true },
    lastSyncedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
)

productSchema.index(
  { userId: 1, storeConnectionId: 1, externalId: 1 },
  {
    unique: true,
    partialFilterExpression: { externalId: { $type: "string", $ne: "" } },
  }
)

module.exports = mongoose.model("Product", productSchema)

