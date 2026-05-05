const axios = require("axios")
const Product = require("../models/Product")

const SHOPIFY_API_VERSION = "2024-01"
const MAX_SHOPIFY_PAGES = 15
const WOO_PER_PAGE = 100

function stripHtml(html) {
  if (!html) return ""
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeShopifyShop(shop) {
  const s = String(shop || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
  return s.toLowerCase()
}

function normalizeWooBaseUrl(url) {
  let u = String(url || "").trim().replace(/\/$/, "")
  if (!u.startsWith("http")) u = `https://${u}`
  return u
}

async function fetchShopifyShopCurrency(shop, accessToken) {
  const base = `https://${shop}/admin/api/${SHOPIFY_API_VERSION}`
  const { data } = await axios.get(`${base}/shop.json`, {
    headers: { "X-Shopify-Access-Token": accessToken },
    timeout: 30000,
  })
  return data?.shop?.currency || "USD"
}

async function fetchAllShopifyProducts(shop, accessToken) {
  const base = `https://${shop}/admin/api/${SHOPIFY_API_VERSION}`
  const headers = { "X-Shopify-Access-Token": accessToken }
  const all = []
  let url = `${base}/products.json?limit=250`
  let pages = 0

  while (url && pages < MAX_SHOPIFY_PAGES) {
    const res = await axios.get(url, { headers, timeout: 60000 })
    const batch = res.data?.products || []
    all.push(...batch)
    pages += 1
    const link = res.headers?.link || res.headers?.Link
    if (!link || typeof link !== "string") break
    const next = link.split(",").find((p) => p.includes('rel="next"'))
    if (!next) break
    const m = next.match(/<([^>]+)>/)
    url = m ? m[1] : null
  }

  return all
}

async function fetchWooDefaultCurrency(baseUrl, key, secret) {
  const auth = { username: key, password: secret }
  try {
    const { data } = await axios.get(`${baseUrl}/wp-json/wc/v3/system_status`, { auth, timeout: 30000 })
    const cur = data?.settings?.currency
    if (cur && typeof cur === "string") return cur
  } catch (_) {}
  return "SAR"
}

async function fetchAllWooProducts(baseUrl, key, secret) {
  const auth = { username: key, password: secret }
  const all = []
  let page = 1
  for (;;) {
    const { data } = await axios.get(`${baseUrl}/wp-json/wc/v3/products`, {
      auth,
      params: { page, per_page: WOO_PER_PAGE, status: "publish" },
      timeout: 60000,
    })
    if (!Array.isArray(data) || data.length === 0) break
    all.push(...data)
    if (data.length < WOO_PER_PAGE) break
    page += 1
    if (page > 50) break
  }
  return all
}

function shopifyProductToRow(product, currency) {
  const v0 = (product.variants && product.variants[0]) || {}
  const price = v0.price != null ? String(v0.price) : "0"
  let stock = 0
  if (Array.isArray(product.variants)) {
    for (const v of product.variants) {
      if (v.inventory_management === "shopify" && v.inventory_quantity != null) {
        stock += Number(v.inventory_quantity) || 0
      }
    }
  }
  const img =
    product.image?.src ||
    (Array.isArray(product.images) && product.images[0]?.src) ||
    ""
  return {
    externalId: String(product.id),
    name: product.title || "Untitled",
    description: stripHtml(product.body_html || ""),
    category: (product.product_type || "").trim(),
    price,
    currency: currency || "USD",
    stock,
    image: img,
  }
}

function wooProductToRow(product, currency) {
  const price =
    product.price != null && String(product.price) !== ""
      ? String(product.price)
      : product.regular_price != null
        ? String(product.regular_price)
        : "0"
  const stock = product.stock_quantity != null ? Number(product.stock_quantity) || 0 : 0
  const img =
    (Array.isArray(product.images) && product.images[0]?.src) || ""
  const cats = Array.isArray(product.categories) ? product.categories.map((c) => c.name).filter(Boolean) : []
  return {
    externalId: String(product.id),
    name: product.name || "Untitled",
    description: stripHtml(product.description || product.short_description || ""),
    category: cats[0] || "",
    price,
    currency: product.currency || currency || "SAR",
    stock,
    image: img,
  }
}

/**
 * @param {import("mongoose").Document} connection — StoreConnection doc with secrets
 * @returns {{ imported: number, updated: number }}
 */
async function syncStoreConnection(connection) {
  const userId = connection.userId
  const connId = connection._id
  let imported = 0
  let updated = 0

  if (connection.provider === "shopify") {
    const shop = normalizeShopifyShop(connection.shopDomain)
    const token = connection.accessToken
    if (!shop || !token) throw new Error("Shopify store is missing domain or access token.")

    const currency = await fetchShopifyShopCurrency(shop, token)
    const products = await fetchAllShopifyProducts(shop, token)

    for (const p of products) {
      const row = shopifyProductToRow(p, currency)
      const existing = await Product.findOne({
        userId,
        storeConnectionId: connId,
        externalId: row.externalId,
      })
      const now = new Date()
      if (existing) {
        existing.name = row.name
        existing.description = row.description
        existing.category = row.category
        existing.price = row.price
        existing.currency = row.currency
        existing.stock = row.stock
        existing.image = row.image
        existing.publicId = ""
        existing.source = "shopify"
        existing.lastSyncedAt = now
        existing.updatedAt = now
        await existing.save()
        updated += 1
      } else {
        await Product.create({
          userId,
          name: row.name,
          description: row.description,
          category: row.category,
          price: row.price,
          currency: row.currency,
          stock: row.stock,
          image: row.image,
          publicId: "",
          source: "shopify",
          storeConnectionId: connId,
          externalId: row.externalId,
          lastSyncedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        imported += 1
      }
    }
  } else if (connection.provider === "woocommerce") {
    const baseUrl = normalizeWooBaseUrl(connection.shopDomain)
    const key = connection.consumerKey
    const secret = connection.consumerSecret
    if (!baseUrl || !key || !secret) throw new Error("WooCommerce store is missing URL or API keys.")

    const currency = await fetchWooDefaultCurrency(baseUrl, key, secret)
    const products = await fetchAllWooProducts(baseUrl, key, secret)

    for (const p of products) {
      const row = wooProductToRow(p, currency)
      const existing = await Product.findOne({
        userId,
        storeConnectionId: connId,
        externalId: row.externalId,
      })
      const now = new Date()
      if (existing) {
        existing.name = row.name
        existing.description = row.description
        existing.category = row.category
        existing.price = row.price
        existing.currency = row.currency
        existing.stock = row.stock
        existing.image = row.image
        existing.publicId = ""
        existing.source = "woocommerce"
        existing.lastSyncedAt = now
        existing.updatedAt = now
        await existing.save()
        updated += 1
      } else {
        await Product.create({
          userId,
          name: row.name,
          description: row.description,
          category: row.category,
          price: row.price,
          currency: row.currency,
          stock: row.stock,
          image: row.image,
          publicId: "",
          source: "woocommerce",
          storeConnectionId: connId,
          externalId: row.externalId,
          lastSyncedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        imported += 1
      }
    }
  } else {
    throw new Error("Unknown store provider.")
  }

  return { imported, updated }
}

module.exports = {
  stripHtml,
  normalizeShopifyShop,
  normalizeWooBaseUrl,
  syncStoreConnection,
  fetchAllWooProducts,
  fetchShopifyShopCurrency,
}
