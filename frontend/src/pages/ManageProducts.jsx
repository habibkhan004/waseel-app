import React, { useState, useMemo } from "react"
import { Search, Plus, X, Pencil, Trash2, Package } from "lucide-react"
import { useProducts } from "../context/ProductsContext"
import { ProductForm } from "./Products"

const CURRENCIES = [
  { code: "SAR", symbol: "SAR" },
  { code: "AED", symbol: "AED" },
  { code: "BHD", symbol: "BHD" },
  { code: "KWD", symbol: "KWD" },
  { code: "OMR", symbol: "OMR" },
  { code: "QAR", symbol: "QAR" },
  { code: "USD", symbol: "$" },
]

function formatPrice(currencyCode, price) {
  const curr = CURRENCIES.find((c) => c.code === currencyCode)
  const sym = curr?.symbol ?? currencyCode
  if (sym === "$") return `$${price}`
  return `${sym} ${price}`
}

function getStatus(stock) {
  if (stock === 0) return "out_of_stock"
  if (stock <= 10) return "low_stock"
  return "in_stock"
}

const statusStyles = {
  in_stock: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
  low_stock: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
  out_of_stock: "bg-slate-100 text-slate-500 dark:bg-slate-600/20 dark:text-slate-400",
}
const statusLabels = { in_stock: "In stock", low_stock: "Low stock", out_of_stock: "Out of stock" }

export default function ManageProductsPage() {
  const { products, loading, error, fetchProducts, addProduct, updateProduct, deleteProduct } = useProducts()
  const [search, setSearch] = useState("")
  const [modal, setModal] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [imgErrors, setImgErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [pageNotice, setPageNotice] = useState(null)
  const [saving, setSaving] = useState(false)

  React.useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
          (p.category || "").toLowerCase().includes(search.toLowerCase()) ||
          (p.description || "").toLowerCase().includes(search.toLowerCase())
      ),
    [products, search]
  )

  const handleAdd = async (data) => {
    setSubmitError(null)
    setSaving(true)
    try {
      await addProduct(data)
      setModal(null)
    } catch (err) {
      setSubmitError(err.message || "Failed to add product")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (data) => {
    if (!modal?.product) return
    setSubmitError(null)
    setSaving(true)
    try {
      await updateProduct(modal.product.id, data)
      setModal(null)
    } catch (err) {
      setSubmitError(err.message || "Failed to update product")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (product) => {
    setSubmitError(null)
    setDeleteConfirm(product)
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    setSaving(true)
    try {
      await deleteProduct(deleteConfirm.id)
      setDeleteConfirm(null)
    } catch (err) {
      setSubmitError(err.message || "Failed to delete product")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 pb-20 md:pb-8 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-slide-up">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Manage product
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-1 dark:text-slate-400">
            Add, edit, or delete products in your catalog.
          </p>
        </div>
        <button
          onClick={() => { setModal("add"); setSubmitError(null); setPageNotice(null); }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--dark-blue)] text-white px-5 py-2.5 font-bold text-sm hover:opacity-90 transition-opacity dark:bg-white dark:text-[var(--dark-blue)] self-start sm:self-auto shadow-lg shadow-[var(--dark-blue)]/20 dark:shadow-slate-900/30"
        >
          <Plus size={18} />
          Add product
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {error}
        </div>
      )}

      {pageNotice && (
        <div className="rounded-xl bg-slate-100 dark:bg-[var(--dark-blue-3)] border border-slate-200 dark:border-[var(--dark-blue-3)] px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
          {pageNotice}
        </div>
      )}

      {loading && products.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">Loading products…</p>
      ) : null}

      <div className="relative max-w-md animate-fade-slide-up">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, category or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20 focus:border-[var(--dark-blue)] dark:bg-[var(--dark-blue)] dark:border-[var(--dark-blue-3)] dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-white/20 dark:focus:border-[var(--dark-blue-4)]"
        />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-[var(--dark-blue-3)] bg-white dark:bg-[var(--dark-blue)] overflow-hidden overflow-x-auto">
        {loading && products.length > 0 ? (
          <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-sm">Updating…</div>
        ) : null}
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-[var(--dark-blue-3)] bg-slate-50 dark:bg-[var(--dark-blue-2)]">
              <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200">Image</th>
              <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200">Name / source</th>
              <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200 hidden sm:table-cell">Category</th>
              <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200 hidden md:table-cell">Description</th>
              <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200">Price</th>
              <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200">Stock</th>
              <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200 hidden lg:table-cell">Status</th>
              <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => {
              const status = getStatus(product.stock)
              return (
                <tr
                  key={product.id}
                  className="border-b border-slate-100 dark:border-[var(--dark-blue-3)] hover:bg-slate-50 dark:hover:bg-[var(--dark-blue-2)] transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-[var(--dark-blue-3)] flex-shrink-0 flex items-center justify-center">
                      {product.image && !imgErrors[product.id] ? (
                        <img
                          src={product.image}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={() => setImgErrors((prev) => ({ ...prev, [product.id]: true }))}
                        />
                      ) : (
                        <Package className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                    <span className="block">{product.name}</span>
                    {product.source && product.source !== "manual" ? (
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300">
                        {product.source === "custom_website" ? "Custom site" : product.source}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 hidden sm:table-cell">{product.category}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-[200px] truncate hidden md:table-cell">
                    {product.description || "—"}
                  </td>
                  <td className="py-3 px-4 font-bold text-[var(--dark-blue)] dark:text-white">
                    {formatPrice(product.currency || "SAR", product.price)}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{product.stock}</td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${statusStyles[status]}`}>
                      {statusLabels[status]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (product.source && product.source !== "manual") {
                            setPageNotice("Synced products can only be changed in your store. Update them in Shopify or WooCommerce, then run Sync from Store connections.")
                            return
                          }
                          setPageNotice(null)
                          setModal({ type: "edit", product })
                          setSubmitError(null)
                        }}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[var(--dark-blue)] dark:hover:bg-[var(--dark-blue-3)] dark:hover:text-white transition-colors disabled:opacity-40"
                        title={product.source && product.source !== "manual" ? "Synced from store" : "Edit"}
                        disabled={!!(product.source && product.source !== "manual")}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(product)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!loading && filteredProducts.length === 0 && (
        <p className="text-center text-slate-500 dark:text-slate-400 py-12">
          {products.length === 0 ? "No products yet. Click Add product to create one." : "No products match your search."}
        </p>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div
            className="bg-white dark:bg-[var(--dark-blue-2)] border border-slate-200 dark:border-[var(--dark-blue-3)] rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-[var(--dark-blue-3)]">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {modal === "add" ? "Add product" : "Edit product"}
              </h2>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-[var(--dark-blue-3)] dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              {submitError && (
                <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                  {submitError}
                </div>
              )}
              <ProductForm
                product={modal === "add" ? null : modal.product}
                onSubmit={modal === "add" ? handleAdd : handleUpdate}
                onCancel={() => { setModal(null); setSubmitError(null); }}
                disabled={saving}
              />
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div
            className="bg-white dark:bg-[var(--dark-blue-2)] border border-slate-200 dark:border-[var(--dark-blue-3)] rounded-2xl shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete product?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              "{deleteConfirm.name}" will be removed. This cannot be undone.
            </p>
            {submitError && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">{submitError}</p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={confirmDelete}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm dark:border-[var(--dark-blue-3)] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[var(--dark-blue-3)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
