/**
 * Live-read product-oriented content from a public storefront URL for WhatsApp AI prompts.
 * No MongoDB import — results are cached briefly in memory only.
 *
 * Strategy: JSON response → JSON-LD Product in HTML → common WooCommerce/Shop-style DOM → page text fallback.
 */

const axios = require("axios")
const cheerio = require("cheerio")

const FETCH_TIMEOUT_MS = Math.min(Math.max(Number(process.env.WEBSITE_SCRAPE_TIMEOUT_MS) || 18000, 5000), 90000)
const MAX_HTML_BYTES = Math.min(Math.max(Number(process.env.WEBSITE_SCRAPE_MAX_BYTES) || 2_500_000, 100_000), 8_000_000)
const CACHE_MS = Math.min(Math.max(Number(process.env.WEBSITE_SCRAPE_CACHE_MS) || 4 * 60 * 1000, 60 * 1000), 30 * 60 * 1000)

/** @type {Map<string, { ts: number, rows: object[] }>} */
const cache = new Map()

function normalizeBaseUrl(url) {
  let u = String(url || "").trim().replace(/\/$/, "")
  if (!u) return ""
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`
  return u
}

function assertSafePublicHttpUrl(urlStr) {
  let u
  try {
    u = new URL(urlStr)
  } catch {
    throw new Error("Invalid URL")
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("Only http(s) URLs are allowed")
  const host = u.hostname.toLowerCase()
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  ) {
    throw new Error("Local addresses are not allowed")
  }
  if (host === "169.254.169.254" || host.endsWith(".internal")) throw new Error("Blocked host")
  if (/^10\.\d+\.\d+\.\d+$/.test(host)) throw new Error("Private network addresses are not allowed")
  if (/^192\.168\.\d+\.\d+$/.test(host)) throw new Error("Private network addresses are not allowed")
  if (/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host)) throw new Error("Private network addresses are not allowed")
  return u.toString()
}

function rowsFromJsonPayload(data) {
  let arr = []
  if (Array.isArray(data)) arr = data
  else if (data && typeof data === "object") {
    if (Array.isArray(data.products)) arr = data.products
    else if (Array.isArray(data.items)) arr = data.items
    else if (Array.isArray(data.data)) arr = data.data
  }
  const out = []
  arr.forEach((raw, i) => {
    if (!raw || typeof raw !== "object") return
    const name = String(raw.name || raw.title || "").trim()
    if (!name) return
    const price = raw.price != null && String(raw.price) !== "" ? String(raw.price) : String(raw.amount ?? "")
    out.push({
      name,
      description: String(raw.description || raw.desc || "").trim().slice(0, 800),
      price: price || "—",
      currency: String(raw.currency || "SAR").trim() || "SAR",
      stock: Number(raw.stock ?? raw.quantity ?? 0) || 0,
      category: String(raw.category || "").trim(),
      image: String(raw.image || raw.imageUrl || "").trim(),
    })
  })
  return out
}

function walkJsonLd(node, out) {
  if (!node) return
  if (Array.isArray(node)) {
    for (const n of node) walkJsonLd(n, out)
    return
  }
  if (typeof node !== "object") return

  const t = node["@type"]
  const types = Array.isArray(t) ? t : t ? [t] : []
  const isProduct = types.some((x) => String(x).toLowerCase() === "product" || String(x).endsWith("/Product"))

  if (isProduct) {
    const name = String(node.name || node.headline || "").trim()
    if (name) {
      let price = ""
      let currency = "SAR"
      const offers = node.offers
      if (offers) {
        const o = Array.isArray(offers) ? offers[0] : offers
        if (o && typeof o === "object") {
          if (o.price != null) price = String(o.price)
          if (o.priceCurrency) currency = String(o.priceCurrency)
        }
      }
      out.push({
        name,
        description: String(node.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 800),
        price: price || "—",
        currency,
        stock: 0,
        category: "",
        image: typeof node.image === "string" ? node.image : Array.isArray(node.image) ? String(node.image[0] || "") : "",
      })
    }
  }

  if (node["@graph"]) walkJsonLd(node["@graph"], out)
  for (const k of Object.keys(node)) {
    if (k === "@context" || k === "@type") continue
    const v = node[k]
    if (v && (typeof v === "object" || Array.isArray(v))) walkJsonLd(v, out)
  }
}

function extractJsonLdProducts($) {
  const out = []
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html()
    if (!raw) return
    try {
      walkJsonLd(JSON.parse(raw.trim()), out)
    } catch (_) {}
  })
  return out
}

function cleanPriceText(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 48)
}

function scrapeDomProducts($) {
  const found = []
  const seen = new Set()

  const push = (name, price, desc = "") => {
    const n = String(name || "").trim()
    if (n.length < 2 || n.length > 200) return
    const key = n.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    found.push({
      name: n,
      description: String(desc || "").trim().slice(0, 400),
      price: cleanPriceText(price) || "—",
      currency: "SAR",
      stock: 0,
      category: "",
      image: "",
    })
  }

  $("li.product").each((_, el) => {
    const $el = $(el)
    const name =
      $el.find(".woocommerce-loop-product__title, .product-title, h2, h3, a").first().text().trim() ||
      $el.find("a").first().text().trim()
    const price = $el.find(".price .amount, .price, ins .woocommerce-Price-amount, .woocommerce-Price-amount").first().text()
    push(name, price)
  })

  $("[data-product-id], [data-product-sku]").each((_, el) => {
    const $el = $(el)
    const name = $el.find(".product-title, .product__title, h2, h3, .title, [class*='title']").first().text().trim() || $el.text().trim().slice(0, 120)
    const price = $el.find("[class*='price'], .money, .price").first().text()
    if (name.length > 3) push(name, price)
  })

  $(".product, .product-item, .product-card, [class*='ProductCard']").each((_, el) => {
    const $el = $(el)
    const name = $el.find("h2, h3, .product-title, [class*='product-title']").first().text().trim()
    const price = $el.find("[class*='price'], .price").first().text()
    if (name.length > 3) push(name, price)
  })

  return found
}

function fallbackPageSummary($) {
  $("script, style, noscript, svg, nav, footer, header").remove()
  const main = $("main, #main, #content, .content, article").first()
  const text = (main.length ? main : $("body")).text().replace(/\s+/g, " ").trim().slice(0, 7000)
  if (text.length < 80) return []
  return [
    {
      name: "Store page (auto excerpt)",
      description: text,
      price: "—",
      currency: "SAR",
      stock: 0,
      category: "",
      image: "",
    },
  ]
}

async function fetchUrlBody(url) {
  const safe = assertSafePublicHttpUrl(url)
  const res = await axios.get(safe, {
    timeout: FETCH_TIMEOUT_MS,
    maxContentLength: MAX_HTML_BYTES,
    maxBodyLength: MAX_HTML_BYTES,
    responseType: "text",
    validateStatus: (s) => s >= 200 && s < 400,
    headers: {
      "User-Agent": "WaseelCatalogBot/1.0 (+https://waseel)",
      Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    },
  })
  const ctype = String(res.headers["content-type"] || "").toLowerCase()
  return { ok: res.status === 200, data: res.data, ctype, finalUrl: res.request?.res?.responseUrl || safe }
}

async function scrapeOneUrl(url) {
  const { ok, data, ctype } = await fetchUrlBody(url)
  if (!ok || data == null) return []

  if (ctype.includes("json") || /^\s*[\[{]/.test(String(data).slice(0, 80))) {
    try {
      const parsed = typeof data === "string" ? JSON.parse(data) : data
      const rows = rowsFromJsonPayload(parsed)
      if (rows.length) return rows
    } catch (_) {}
  }

  const html = String(data)
  const $ = cheerio.load(html)

  const fromLd = extractJsonLdProducts($)
  if (fromLd.length) return dedupeRows(fromLd)

  const fromDom = scrapeDomProducts($)
  if (fromDom.length) return dedupeRows(fromDom)

  return dedupeRows(fallbackPageSummary($))
}

function dedupeRows(rows) {
  const seen = new Set()
  const out = []
  for (const r of rows) {
    const k = String(r.name || "")
      .toLowerCase()
      .slice(0, 120)
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(r)
    if (out.length >= 80) break
  }
  return out
}

function buildUrlList(connection) {
  const urls = []
  const custom = String(connection.customApiUrl || "").trim()
  if (custom) {
    try {
      urls.push(assertSafePublicHttpUrl(normalizeBaseUrl(custom)))
    } catch (_) {}
  }
  const base = normalizeBaseUrl(connection.shopDomain || "")
  if (base) {
    try {
      const b = assertSafePublicHttpUrl(base)
      if (!urls.includes(b)) urls.push(b)
      const paths = ["/products", "/collections/all", "/shop", "/store", "/catalog"]
      for (const p of paths) {
        try {
          const u = new URL(p, b.endsWith("/") ? b : b + "/").toString()
          const n = assertSafePublicHttpUrl(u)
          if (!urls.includes(n)) urls.push(n)
        } catch (_) {}
      }
    } catch (_) {}
  }
  return urls
}

/**
 * @param {object} connection StoreConnection lean/doc
 * @param {{ useCache?: boolean }} opts
 * @returns {Promise<object[]>} Plain product-like rows for LLM catalog text
 */
async function fetchWebsiteProductsForReply(connection, opts = {}) {
  const useCache = opts.useCache !== false
  const key = `scrape:${String(connection._id)}`
  if (useCache && cache.has(key)) {
    const e = cache.get(key)
    if (e && Date.now() - e.ts < CACHE_MS) return e.rows
  }

  const urls = buildUrlList(connection)
  let merged = []
  const seenNames = new Set()

  for (const url of urls) {
    try {
      const batch = await scrapeOneUrl(url)
      for (const row of batch) {
        const k = String(row.name || "")
          .toLowerCase()
          .slice(0, 120)
        if (!k || seenNames.has(k)) continue
        seenNames.add(k)
        merged.push(row)
      }
      if (merged.length >= 12) break
    } catch (err) {
      console.warn("[websiteProductScraper]", url, err.message)
    }
  }

  merged = merged.slice(0, 80)
  if (useCache) cache.set(key, { ts: Date.now(), rows: merged })
  return merged
}

function clearWebsiteCatalogCache(connectionId) {
  const id = String(connectionId)
  cache.delete(`scrape:${id}`)
}

module.exports = {
  fetchWebsiteProductsForReply,
  clearWebsiteCatalogCache,
  normalizeBaseUrl,
  assertSafePublicHttpUrl,
}
