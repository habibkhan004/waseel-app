import React, { useState, useMemo } from "react"
import { Package, Search, MoreHorizontal, Pencil, Trash2, ImagePlus } from "lucide-react"
import { useProducts } from "../context/ProductsContext"

function getStatus(stock) {
  if (stock === 0) return "out_of_stock"
  if (stock <= 10) return "low_stock"
  return "in_stock"
}

const statusStyles = {
  in_stock: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/30",
  low_stock: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-400/10 dark:text-amber-400 dark:border-amber-400/30",
  out_of_stock: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-600/20 dark:text-slate-400 dark:border-slate-500/30",
}
const statusLabels = { in_stock: "In stock", low_stock: "Low stock", out_of_stock: "Out of stock" }

const PLACEHOLDER_IMAGE = "https://picsum.photos/seed/product/400/300"

const CURRENCIES = [
  { code: "SAR", name: "Saudi Riyal (SAR)", symbol: "SAR" },
  { code: "AED", name: "UAE Dirham (AED)", symbol: "AED" },
  { code: "BHD", name: "Bahraini Dinar (BHD)", symbol: "BHD" },
  { code: "KWD", name: "Kuwaiti Dinar (KWD)", symbol: "KWD" },
  { code: "OMR", name: "Omani Rial (OMR)", symbol: "OMR" },
  { code: "QAR", name: "Qatari Riyal (QAR)", symbol: "QAR" },
  { code: "USD", name: "US Dollar (USD)", symbol: "$" },
]

function formatPrice(currencyCode, price) {
  const curr = CURRENCIES.find((c) => c.code === currencyCode)
  const sym = curr?.symbol ?? currencyCode
  if (sym === "$") return `$${price}`
  return `${sym} ${price}`
}

function ProductForm({ product, onSubmit, onCancel, disabled = false }) {
  const isEdit = !!product
  const [name, setName] = useState(product?.name ?? "")
  const [description, setDescription] = useState(product?.description ?? "")
  const [uploadedImage, setUploadedImage] = useState(null) // base64 data URL or null
  const [imageRemoved, setImageRemoved] = useState(false) // user clicked "Remove image"
  const [category, setCategory] = useState(product?.category ?? "")
  const [price, setPrice] = useState(product?.price ?? "")
  const [currency, setCurrency] = useState(product?.currency ?? "SAR")
  const [stock, setStock] = useState(product?.stock ?? 0)

  const previewImage = imageRemoved ? null : (uploadedImage || product?.image || null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = () => {
      setUploadedImage(reader.result)
      setImageRemoved(false)
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const clearImage = () => {
    setUploadedImage(null)
    setImageRemoved(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const imageToSave = imageRemoved
      ? ""
      : (uploadedImage ?? (isEdit ? product?.image : null) ?? "")
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      image: imageToSave,
      category: category.trim(),
      price: price.trim(),
      currency: currency,
      stock: Math.max(0, parseInt(stock, 10) || 0),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20 focus:border-[var(--dark-blue)] dark:bg-[var(--dark-blue)] dark:border-[var(--dark-blue-3)] dark:text-white dark:focus:border-[var(--dark-blue-4)]"
          placeholder="Product name"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20 focus:border-[var(--dark-blue)] dark:bg-[var(--dark-blue)] dark:border-[var(--dark-blue-3)] dark:text-white dark:focus:border-[var(--dark-blue-4)] resize-none"
          placeholder="Short description"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Product image</label>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-full sm:w-40 aspect-square rounded-xl border-2 border-dashed border-slate-200 dark:border-[var(--dark-blue-3)] overflow-hidden bg-slate-50 dark:bg-[var(--dark-blue-3)] flex-shrink-0">
            {previewImage ? (
              <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-2">
                <ImagePlus className="w-8 h-8 mb-1" />
                <span className="text-xs text-center">No image</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <label className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-[var(--dark-blue-3)] bg-white dark:bg-[var(--dark-blue)] px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[var(--dark-blue-2)] transition-colors">
              <ImagePlus size={18} />
              Upload image
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
            {previewImage && (
              <button
                type="button"
                onClick={clearImage}
                className="text-xs font-medium text-slate-500 hover:text-red-600 dark:hover:text-red-400"
              >
                Remove image
              </button>
            )}
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Images upload to Cloudinary when you save.
            </p>
          </div>
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20 focus:border-[var(--dark-blue)] dark:bg-[var(--dark-blue)] dark:border-[var(--dark-blue-3)] dark:text-white dark:focus:border-[var(--dark-blue-4)]"
          placeholder="e.g. Perfume"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Price</label>
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20 focus:border-[var(--dark-blue)] dark:bg-[var(--dark-blue)] dark:border-[var(--dark-blue-3)] dark:text-white dark:focus:border-[var(--dark-blue-4)]"
            placeholder="199"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20 focus:border-[var(--dark-blue)] dark:bg-[var(--dark-blue)] dark:border-[var(--dark-blue-3)] dark:text-white dark:focus:border-[var(--dark-blue-4)]"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Stock</label>
        <input
          type="number"
          min={0}
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20 focus:border-[var(--dark-blue)] dark:bg-[var(--dark-blue)] dark:border-[var(--dark-blue-3)] dark:text-white dark:focus:border-[var(--dark-blue-4)]"
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={disabled}
          className="flex-1 py-2.5 rounded-xl bg-[var(--dark-blue)] text-white font-bold text-sm hover:opacity-90 dark:bg-white dark:text-[var(--dark-blue)] disabled:opacity-50"
        >
          {disabled ? "Saving…" : (isEdit ? "Update" : "Add") + " product"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 dark:border-[var(--dark-blue-3)] dark:text-slate-300 dark:hover:bg-[var(--dark-blue-3)]"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function ProductCard({ product, onEdit, onDelete }) {
  const status = getStatus(product.stock)
  const [menuOpen, setMenuOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const showActions = typeof onEdit === "function" || typeof onDelete === "function"

  return (
    <div className="group bg-white dark:bg-[var(--dark-blue)] border border-slate-200 dark:border-[var(--dark-blue-3)] rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-lg sm:hover:shadow-xl hover:-translate-y-0.5 sm:hover:-translate-y-1 transition-all duration-300 dark:hover:border-[var(--dark-blue-4)] dark:shadow-none dark:hover:shadow-lg dark:hover:shadow-black/20">
      <div className="aspect-[4/3] bg-slate-100 dark:bg-[var(--dark-blue-3)] relative overflow-hidden">
        {!imgError && product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 sm:w-14 sm:h-14 text-slate-400 dark:text-slate-500" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <span className={`absolute top-1.5 right-1.5 sm:top-2 sm:right-2 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 rounded border shadow-sm ${statusStyles[status]}`}>
          {statusLabels[status]}
        </span>
        <span className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 px-1.5 py-0.5 sm:px-2 rounded-md bg-white/90 dark:bg-[var(--dark-blue)]/90 text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 backdrop-blur-sm">
          {product.category}
        </span>
      </div>
      <div className="p-2.5 sm:p-4">
        <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm leading-tight line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem]">
          {product.name}
        </h3>
        <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 mt-1 sm:mt-1.5 line-clamp-2 min-h-[1.5rem] sm:min-h-[2rem]">
          {product.description}
        </p>
        <p className="text-sm sm:text-base font-black text-[var(--dark-blue)] dark:text-white mt-1.5 sm:mt-2">
          {formatPrice(product.currency || "SAR", product.price)}
        </p>
        <div className="mt-2 sm:mt-4 pt-2 sm:pt-3 border-t border-slate-100 dark:border-[var(--dark-blue-3)] flex items-center justify-between gap-1">
          <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400">
            Stock: <strong className="text-slate-700 dark:text-slate-300">{product.stock}</strong>
          </span>
          {showActions && (
            <div className="flex items-center gap-0.5">
              {typeof onEdit === "function" && (
                <button
                  type="button"
                  onClick={() => { onEdit(product); }}
                  className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[var(--dark-blue)] dark:hover:bg-[var(--dark-blue-3)] dark:hover:text-white transition-colors"
                  title="Edit"
                >
                  <Pencil size={12} />
                </button>
              )}
              {typeof onDelete === "function" && (
                <button
                  type="button"
                  onClick={() => onDelete(product)}
                  className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              )}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-[var(--dark-blue-3)] dark:hover:text-white transition-colors"
                >
                  <MoreHorizontal size={12} />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                    <div className="absolute right-0 top-full mt-1 z-20 py-1 min-w-[100px] rounded-lg bg-white border border-slate-200 shadow-lg dark:bg-[var(--dark-blue-2)] dark:border-[var(--dark-blue-3)]">
                      {typeof onEdit === "function" && (
                        <button
                          type="button"
                          onClick={() => { onEdit(product); setMenuOpen(false); }}
                          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-[var(--dark-blue-3)]"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                      )}
                      {typeof onDelete === "function" && (
                        <button
                          type="button"
                          onClick={() => { onDelete(product); setMenuOpen(false); }}
                          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { ProductForm, ProductCard }

export default function ProductsPage() {
  const { products, loading, error, fetchProducts } = useProducts()
  const [search, setSearch] = useState("")

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

  return (
    <div className="space-y-8 pb-20 md:pb-8 min-h-screen">
      <div className="animate-fade-slide-up">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
          Products
        </h1>
        <p className="text-sm md:text-base text-slate-500 mt-1 dark:text-slate-400">
          Browse your product catalog.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {error}
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

      {!loading || products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : null}

      {!loading && filteredProducts.length === 0 && (
        <p className="text-center text-slate-500 dark:text-slate-400 py-12">
          {products.length === 0 ? "No products yet. Add some in Manage product." : "No products match your search."}
        </p>
      )}
    </div>
  )
}
