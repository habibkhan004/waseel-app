import React, { useState, useCallback, useEffect } from "react"
import {
  Store,
  RefreshCw,
  Unplug,
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  Plus,
  X,
  ChevronRight,
  ChevronLeft,
  Globe,
} from "lucide-react"
import { apiGet, apiPost, apiDelete } from "../lib/api"

function formatTime(d) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleString()
  } catch {
    return "—"
  }
}

function providerTitle(provider) {
  if (provider === "woocommerce") return "WooCommerce"
  if (provider === "custom_website") return "Custom website"
  return "Shopify"
}

const modalPanel =
  "bg-white dark:bg-[var(--dark-blue-2)] border border-slate-200 dark:border-[var(--dark-blue-3)] rounded-2xl shadow-xl w-full max-w-lg max-h-[min(90vh,640px)] overflow-hidden flex flex-col"
const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[var(--dark-blue-3)] bg-white dark:bg-[var(--dark-blue)] text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/25 dark:focus:ring-white/20"

export default function StoresPage() {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [banner, setBanner] = useState(null)

  /** null | 'pick' | 'shopify' | 'woocommerce' | 'custom' */
  const [connectStep, setConnectStep] = useState(null)

  const [shopifyShop, setShopifyShop] = useState("")
  const [shopifyToken, setShopifyToken] = useState("")
  const [shopifyLabel, setShopifyLabel] = useState("")
  const [wooUrl, setWooUrl] = useState("")
  const [wooKey, setWooKey] = useState("")
  const [wooSecret, setWooSecret] = useState("")
  const [wooLabel, setWooLabel] = useState("")
  const [customUrl, setCustomUrl] = useState("")
  const [customLabel, setCustomLabel] = useState("")
  const [customApiUrl, setCustomApiUrl] = useState("")
  const [customNotes, setCustomNotes] = useState("")

  const [busyId, setBusyId] = useState(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  const load = useCallback(async () => {
    setError("")
    setLoading(true)
    const { ok, data } = await apiGet("/api/stores")
    if (ok) setStores(data.stores || [])
    else setError(data?.message || "Failed to load stores.")
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const closeConnectModal = () => {
    setConnectStep(null)
    setShopifyShop("")
    setShopifyToken("")
    setShopifyLabel("")
    setWooUrl("")
    setWooKey("")
    setWooSecret("")
    setWooLabel("")
    setCustomUrl("")
    setCustomLabel("")
    setCustomApiUrl("")
    setCustomNotes("")
  }

  const saveShopify = async (e) => {
    e.preventDefault()
    setError("")
    setFormSubmitting(true)
    const { ok, data } = await apiPost("/api/stores/shopify", {
      shop: shopifyShop.trim(),
      accessToken: shopifyToken.trim(),
      label: shopifyLabel.trim(),
    })
    setFormSubmitting(false)
    if (!ok) {
      setError(data?.message || "Shopify connection failed.")
      return
    }
    closeConnectModal()
    setBanner({ type: "ok", text: "Shopify saved. Use Sync catalog on the store row to import products." })
    await load()
  }

  const saveWoo = async (e) => {
    e.preventDefault()
    setError("")
    setFormSubmitting(true)
    const { ok, data } = await apiPost("/api/stores/woocommerce", {
      siteUrl: wooUrl.trim(),
      consumerKey: wooKey.trim(),
      consumerSecret: wooSecret.trim(),
      label: wooLabel.trim(),
    })
    setFormSubmitting(false)
    if (!ok) {
      setError(data?.message || "WooCommerce connection failed.")
      return
    }
    closeConnectModal()
    setBanner({ type: "ok", text: "WooCommerce saved. Sync catalog to import products." })
    await load()
  }

  const saveCustom = async (e) => {
    e.preventDefault()
    setError("")
    setFormSubmitting(true)
    const { ok, data } = await apiPost("/api/stores/custom", {
      siteUrl: customUrl.trim(),
      label: customLabel.trim(),
      apiUrl: customApiUrl.trim(),
      notes: customNotes.trim(),
    })
    setFormSubmitting(false)
    if (!ok) {
      setError(data?.message || "Could not save website.")
      return
    }
    closeConnectModal()
    setBanner({
      type: "ok",
      text: "Custom website saved. WhatsApp AI will fetch your public product pages when replying (cached a few minutes). Send a test message to verify.",
    })
    await load()
  }

  const syncOne = async (id) => {
    setError("")
    setBusyId(id)
    const { ok, data } = await apiPost(`/api/stores/${id}/sync`, {})
    setBusyId(null)
    if (!ok) {
      setError(data?.message || "Sync failed.")
      return
    }
    setBanner({
      type: "ok",
      text: `Sync complete: ${data.imported || 0} new, ${data.updated || 0} updated.`,
    })
    await load()
  }

  const disconnect = async (id) => {
    if (!window.confirm("Disconnect this store and remove any products imported from it in Waseel?")) return
    setError("")
    setBusyId(id)
    const { ok, data } = await apiDelete(`/api/stores/${id}`)
    setBusyId(null)
    if (!ok) {
      setError(data?.message || "Failed to disconnect.")
      return
    }
    setBanner({ type: "ok", text: "Store disconnected." })
    await load()
  }

  const platformOptions = [
    {
      id: "shopify",
      title: "Shopify",
      desc: "Admin API access token from your store",
      icon: ShoppingBag,
      iconBg: "bg-[#96bf48]/20",
      iconColor: "text-[#5c8a30]",
    },
    {
      id: "woocommerce",
      title: "WooCommerce",
      desc: "REST API keys from WordPress",
      icon: Store,
      iconBg: "bg-purple-500/15",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      id: "custom",
      title: "Custom website",
      desc: "We read your live shop pages for WhatsApp replies (no DB sync)",
      icon: Globe,
      iconBg: "bg-sky-500/15",
      iconColor: "text-sky-600 dark:text-sky-400",
    },
  ]

  return (
    <div className="space-y-8 pb-20 md:pb-8 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 animate-fade-slide-up">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Store connections
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-1 dark:text-slate-400 max-w-xl">
            Shopify and WooCommerce use your API keys and can sync into Manage products. Custom sites are read live from your public HTML when the AI replies — not stored as a searchable product list in the database.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError("")
            setConnectStep("pick")
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--dark-blue)] text-white px-6 py-3 font-bold text-sm hover:opacity-90 transition-opacity dark:bg-white dark:text-[var(--dark-blue)] self-start shadow-lg shadow-[var(--dark-blue)]/20 dark:shadow-slate-900/30"
        >
          <Plus size={20} />
          Connect store
        </button>
      </div>

      {banner?.type === "ok" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 px-4 py-3 flex gap-3 text-sm text-emerald-900 dark:text-emerald-200">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{banner.text}</span>
        </div>
      )}
      {banner?.type === "err" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-4 py-3 flex gap-3 text-sm text-amber-900 dark:text-amber-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{banner.text}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {connectStep && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={closeConnectModal}
        >
          <div className={modalPanel} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[var(--dark-blue-3)] flex-shrink-0">
              {connectStep !== "pick" ? (
                <button
                  type="button"
                  onClick={() => setConnectStep("pick")}
                  className="flex items-center gap-1 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-[var(--dark-blue)] dark:hover:text-white"
                >
                  <ChevronLeft size={18} />
                  Back
                </button>
              ) : (
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400">New connection</span>
              )}
              <button
                type="button"
                onClick={closeConnectModal}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[var(--dark-blue-3)] dark:hover:text-white"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5">
              {connectStep === "pick" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Choose platform</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Select where your products are sold. You’ll enter API details next.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {platformOptions.map((opt) => {
                      const Icon = opt.icon
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setConnectStep(opt.id === "custom" ? "custom" : opt.id)}
                          className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-[var(--dark-blue-3)] bg-slate-50/80 dark:bg-[var(--dark-blue)] hover:border-[var(--dark-blue)]/40 dark:hover:border-white/20 transition-colors text-left group"
                        >
                          <div
                            className={`w-12 h-12 rounded-xl ${opt.iconBg} flex items-center justify-center flex-shrink-0`}
                          >
                            <Icon className={`w-6 h-6 ${opt.iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-900 dark:text-white">{opt.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[var(--dark-blue)] dark:group-hover:text-white flex-shrink-0" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {connectStep === "shopify" && (
                <form onSubmit={saveShopify} className="space-y-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Shopify</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      In Shopify Admin: <strong>Settings → Apps and sales channels → Develop apps</strong>. Create a custom app with{" "}
                      <strong>read_products</strong> (and <strong>read_inventory</strong> if needed), install it, then paste the{" "}
                      <strong>Admin API access token</strong>.
                    </p>
                  </div>
                  <input
                    required
                    type="text"
                    placeholder="Store subdomain (e.g. your-store)"
                    value={shopifyShop}
                    onChange={(e) => setShopifyShop(e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Label (optional)"
                    value={shopifyLabel}
                    onChange={(e) => setShopifyLabel(e.target.value)}
                    className={inputClass}
                  />
                  <input
                    required
                    type="password"
                    placeholder="Admin API access token"
                    value={shopifyToken}
                    onChange={(e) => setShopifyToken(e.target.value)}
                    autoComplete="off"
                    className={inputClass}
                  />
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="w-full py-3 rounded-xl bg-[var(--dark-blue)] text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-[var(--dark-blue)]"
                  >
                    {formSubmitting ? "Saving…" : "Save connection"}
                  </button>
                </form>
              )}

              {connectStep === "woocommerce" && (
                <form onSubmit={saveWoo} className="space-y-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">WooCommerce</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      In WordPress: <strong>WooCommerce → Settings → Advanced → REST API</strong>. Create a key with read access.
                    </p>
                  </div>
                  <input
                    required
                    type="url"
                    placeholder="https://your-site.com"
                    value={wooUrl}
                    onChange={(e) => setWooUrl(e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Label (optional)"
                    value={wooLabel}
                    onChange={(e) => setWooLabel(e.target.value)}
                    className={inputClass}
                  />
                  <input
                    required
                    type="text"
                    placeholder="Consumer key"
                    value={wooKey}
                    onChange={(e) => setWooKey(e.target.value)}
                    className={inputClass}
                  />
                  <input
                    required
                    type="password"
                    placeholder="Consumer secret"
                    value={wooSecret}
                    onChange={(e) => setWooSecret(e.target.value)}
                    className={inputClass}
                  />
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="w-full py-3 rounded-xl bg-[var(--dark-blue)] text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-[var(--dark-blue)]"
                  >
                    {formSubmitting ? "Saving…" : "Save connection"}
                  </button>
                </form>
              )}

              {connectStep === "custom" && (
                <form onSubmit={saveCustom} className="space-y-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Custom website</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      The server <strong>opens your public shop pages</strong> when a WhatsApp reply is generated: it looks for{" "}
                      <strong>JSON-LD Product</strong> data, common WooCommerce / product-card HTML, or falls back to readable text from the page.
                      Nothing is saved into your Waseel product database for this path.
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      <strong>Tip:</strong> If products are not on the homepage, set <em>Products page URL</em> to the exact page that lists items (e.g.{" "}
                      <code className="break-all text-[11px]">/products</code>). SPAs that load everything in JavaScript may return thin results unless
                      they ship structured data in HTML.
                    </p>
                  </div>
                  <input
                    required
                    type="url"
                    placeholder="Storefront URL (https://…)"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Label (optional)"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="url"
                    placeholder="Products page URL (optional, e.g. https://yoursite.com/products)"
                    value={customApiUrl}
                    onChange={(e) => setCustomApiUrl(e.target.value)}
                    className={inputClass}
                  />
                  <textarea
                    placeholder="Notes (optional)"
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="w-full py-3 rounded-xl bg-[var(--dark-blue)] text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-[var(--dark-blue)]"
                  >
                    {formSubmitting ? "Saving…" : "Save connection"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 dark:border-[var(--dark-blue-3)] bg-white dark:bg-[var(--dark-blue)] overflow-hidden animate-fade-slide-up">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[var(--dark-blue-3)] flex items-center justify-between">
          <h3 className="font-black text-slate-900 dark:text-white">Connected stores</h3>
          <button
            type="button"
            onClick={load}
            className="text-sm font-bold text-[var(--dark-blue)] dark:text-white hover:underline"
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <p className="p-6 text-slate-500 dark:text-slate-400 text-sm">Loading…</p>
        ) : stores.length === 0 ? (
          <p className="p-6 text-slate-500 dark:text-slate-400 text-sm">
            No stores yet. Click <strong>Connect store</strong> to add one.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-[var(--dark-blue-3)]">
            {stores.map((s) => {
              const canSync = s.syncSupported !== false
              return (
                <li key={s.id} className="p-6 flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white">{providerTitle(s.provider)}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 truncate" title={s.shopDomain}>
                      {s.shopDomain}
                    </p>
                    {s.label ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
                    ) : null}
                    {s.provider === "custom_website" && s.customApiUrl ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate" title={s.customApiUrl}>
                        API: {s.customApiUrl}
                      </p>
                    ) : null}
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {canSync ? (
                        <>
                          Last sync: {formatTime(s.lastSyncedAt)}
                          {s.lastSyncError ? (
                            <span className="text-red-600 dark:text-red-400 ml-2">({s.lastSyncError})</span>
                          ) : null}
                        </>
                      ) : (
                        <span>Live page read for AI — no catalog sync to Manage products.</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canSync ? (
                      <button
                        type="button"
                        onClick={() => syncOne(s.id)}
                        disabled={busyId === s.id}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-[var(--dark-blue-2)] text-slate-900 dark:text-white font-bold text-sm hover:opacity-90 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${busyId === s.id ? "animate-spin" : ""}`} />
                        Sync catalog
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => disconnect(s.id)}
                      disabled={busyId === s.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-700 dark:border-red-800 dark:text-red-300 font-bold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                    >
                      <Unplug className="w-4 h-4" />
                      Disconnect
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
