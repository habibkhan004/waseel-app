const axios = require("axios")
const StoreConnection = require("../models/StoreConnection")
const Product = require("../models/Product")
const { syncStoreConnection, normalizeWooBaseUrl, fetchShopifyShopCurrency } = require("../services/storeSync")
const { clearWebsiteCatalogCache } = require("../services/websiteProductScraper")

function toShopifyHostname(input) {
  let s = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
  if (!s) return ""
  if (!s.endsWith(".myshopify.com")) {
    s = s.replace(/\.myshopify\.com$/i, "")
    s = `${s}.myshopify.com`
  }
  return s
}

function sanitizeConnection(doc) {
  if (!doc) return null
  const o = typeof doc.toObject === "function" ? doc.toObject() : doc
  return {
    id: o._id,
    provider: o.provider,
    shopDomain: o.shopDomain,
    label: o.label || "",
    customApiUrl: o.customApiUrl || "",
    notes: o.notes || "",
    syncSupported: o.provider === "shopify" || o.provider === "woocommerce",
    lastSyncedAt: o.lastSyncedAt || null,
    lastSyncError: o.lastSyncError || "",
    createdAt: o.createdAt,
  }
}

async function list(req, res) {
  try {
    const rows = await StoreConnection.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean()
    res.json({ stores: rows.map((r) => sanitizeConnection(r)) })
  } catch (err) {
    console.error("stores list error:", err)
    res.status(500).json({ message: "Failed to load store connections." })
  }
}

/**
 * Each merchant uses their own Shopify custom app + Admin API access token
 * (created in Shopify Admin → Settings → Apps → Develop apps). No shared app keys in .env.
 */
async function connectShopify(req, res) {
  try {
    const { shop, accessToken, label = "" } = req.body || {}
    if (!shop || !accessToken) {
      return res.status(400).json({ message: "shop and accessToken are required." })
    }

    const hostname = toShopifyHostname(shop)
    if (!hostname) return res.status(400).json({ message: "Enter your Shopify store (e.g. my-store or my-store.myshopify.com)." })

    const token = String(accessToken).trim()
    await fetchShopifyShopCurrency(hostname, token)

    let conn = await StoreConnection.findOne({
      userId: req.user.id,
      provider: "shopify",
      shopDomain: hostname,
    })
    const now = new Date()
    if (conn) {
      conn.accessToken = token
      conn.label = String(label || "").trim()
      conn.lastSyncError = ""
      conn.updatedAt = now
      await conn.save()
    } else {
      conn = await StoreConnection.create({
        userId: req.user.id,
        provider: "shopify",
        shopDomain: hostname,
        accessToken: token,
        label: String(label || "").trim(),
        createdAt: now,
        updatedAt: now,
      })
    }

    res.status(201).json({ store: sanitizeConnection(conn) })
  } catch (err) {
    const status = err?.response?.status
    const shopifyErrors = err?.response?.data?.errors
    console.error("connectShopify error:", status || err?.message, shopifyErrors || err?.response?.data)
    if (status === 401 || status === 403) {
      return res.status(400).json({ message: "Invalid Admin API access token or missing required scopes (needs read access to products)." })
    }
    if (status === 404) {
      return res.status(400).json({ message: "Store not found. Check the .myshopify.com domain." })
    }
    res.status(400).json({ message: "Could not verify Shopify credentials. Check store URL and Admin API access token." })
  }
}

async function connectWoo(req, res) {
  try {
    const { siteUrl, consumerKey, consumerSecret, label = "" } = req.body || {}
    if (!siteUrl || !consumerKey || !consumerSecret) {
      return res.status(400).json({ message: "siteUrl, consumerKey, and consumerSecret are required." })
    }

    const baseUrl = normalizeWooBaseUrl(siteUrl)
    const auth = { username: String(consumerKey), password: String(consumerSecret) }
    await axios.get(`${baseUrl}/wp-json/wc/v3/products`, {
      auth,
      params: { per_page: 1, page: 1 },
      timeout: 25000,
    })

    const shopDomain = baseUrl
    let conn = await StoreConnection.findOne({
      userId: req.user.id,
      provider: "woocommerce",
      shopDomain,
    })
    const now = new Date()
    if (conn) {
      conn.consumerKey = String(consumerKey)
      conn.consumerSecret = String(consumerSecret)
      conn.label = String(label || "").trim()
      conn.lastSyncError = ""
      conn.updatedAt = now
      await conn.save()
    } else {
      conn = await StoreConnection.create({
        userId: req.user.id,
        provider: "woocommerce",
        shopDomain,
        consumerKey: String(consumerKey),
        consumerSecret: String(consumerSecret),
        label: String(label || "").trim(),
        createdAt: now,
        updatedAt: now,
      })
    }

    res.status(201).json({ store: sanitizeConnection(conn) })
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || "WooCommerce connection failed."
    console.error("connectWoo error:", err?.response?.data || err?.message)
    res.status(400).json({ message: typeof msg === "string" ? msg : "Could not reach WooCommerce REST API. Check URL and API keys." })
  }
}

async function connectCustom(req, res) {
  try {
    const { siteUrl, label = "", apiUrl = "", notes = "" } = req.body || {}
    if (!siteUrl || !String(siteUrl).trim()) {
      return res.status(400).json({ message: "Website URL is required." })
    }

    const shopDomain = normalizeWooBaseUrl(siteUrl)
    let customApiUrl = String(apiUrl || "").trim()
    if (customApiUrl) customApiUrl = normalizeWooBaseUrl(customApiUrl)

    let conn = await StoreConnection.findOne({
      userId: req.user.id,
      provider: "custom_website",
      shopDomain,
    })
    const now = new Date()
    if (conn) {
      conn.label = String(label || "").trim()
      conn.customApiUrl = customApiUrl
      conn.notes = String(notes || "").trim().slice(0, 4000)
      conn.lastSyncError = ""
      conn.updatedAt = now
      await conn.save()
    } else {
      conn = await StoreConnection.create({
        userId: req.user.id,
        provider: "custom_website",
        shopDomain,
        label: String(label || "").trim(),
        customApiUrl,
        notes: String(notes || "").trim().slice(0, 4000),
        createdAt: now,
        updatedAt: now,
      })
    }

    try {
      clearWebsiteCatalogCache(conn._id)
    } catch (_) {}

    res.status(201).json({ store: sanitizeConnection(conn) })
  } catch (err) {
    console.error("connectCustom error:", err)
    res.status(500).json({ message: "Failed to save custom website." })
  }
}

async function remove(req, res) {
  try {
    const conn = await StoreConnection.findOne({ _id: req.params.id, userId: req.user.id })
    if (!conn) return res.status(404).json({ message: "Store connection not found." })

    await Product.deleteMany({ userId: req.user.id, storeConnectionId: conn._id })
    await StoreConnection.deleteOne({ _id: conn._id })
    res.json({ ok: true })
  } catch (err) {
    console.error("store remove error:", err)
    res.status(500).json({ message: "Failed to disconnect store." })
  }
}

async function sync(req, res) {
  try {
    const conn = await StoreConnection.findOne({ _id: req.params.id, userId: req.user.id })
    if (!conn) return res.status(404).json({ message: "Store connection not found." })

    if (conn.provider === "custom_website") {
      return res.status(400).json({
        message:
          "Custom websites are read live from your public pages when generating replies — nothing is synced to the product database. Use Shopify or WooCommerce if you want catalog sync into Manage products.",
      })
    }

    const { imported, updated } = await syncStoreConnection(conn)
    conn.lastSyncedAt = new Date()
    conn.lastSyncError = ""
    conn.updatedAt = new Date()
    await conn.save()

    res.json({ ok: true, imported, updated, store: sanitizeConnection(conn) })
  } catch (err) {
    console.error("store sync error:", err)
    try {
      const conn = await StoreConnection.findOne({ _id: req.params.id, userId: req.user.id })
      if (conn) {
        conn.lastSyncError = String(err?.message || "Sync failed").slice(0, 500)
        conn.updatedAt = new Date()
        await conn.save()
      }
    } catch (_) {}
    res.status(500).json({ message: err?.message || "Sync failed." })
  }
}

module.exports = {
  list,
  connectShopify,
  connectWoo,
  connectCustom,
  remove,
  sync,
}
