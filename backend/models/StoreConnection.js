const mongoose = require("mongoose")

const storeConnectionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, enum: ["shopify", "woocommerce", "custom_website"], required: true },
    /** Shopify: mystore.myshopify.com — WooCommerce / custom: HTTPS store URL */
    shopDomain: { type: String, required: true, trim: true },
    /** Shopify Admin API access token */
    accessToken: { type: String, default: "" },
    /** WooCommerce REST API */
    consumerKey: { type: String, default: "" },
    consumerSecret: { type: String, default: "" },
    /** Custom site: optional products/API base URL or webhook target */
    customApiUrl: { type: String, default: "", trim: true },
    /** Custom site: free-form notes */
    notes: { type: String, default: "", trim: true },
    label: { type: String, default: "", trim: true },
    lastSyncedAt: { type: Date },
    lastSyncError: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
)

storeConnectionSchema.index({ userId: 1, provider: 1, shopDomain: 1 }, { unique: true })

module.exports = mongoose.model("StoreConnection", storeConnectionSchema)
