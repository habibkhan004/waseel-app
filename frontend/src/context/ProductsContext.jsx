import { createContext, useContext, useState, useCallback } from "react"
import { apiDelete, apiGet, apiPost, apiPut } from "../lib/api"

const ProductsContext = createContext(null)

function isDataUrlImage(str) {
  return typeof str === "string" && /^data:image\/[a-zA-Z]+;base64,/.test(str)
}

function normalizeProduct(p) {
  if (!p) return p
  // Keep backward compatibility with UI that expects `id`
  return {
    ...p,
    id: p.id || p._id,
    source: p.source || "manual",
  }
}

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const uploadToCloudinaryIfNeeded = useCallback(async ({ image, publicId }) => {
    if (!image) return { image: "", publicId: "" }
    if (!isDataUrlImage(image)) return { image, publicId: publicId || "" }

    const { ok, data } = await apiPost("/api/uploads/image", { dataUrl: image, folder: "waseel/products" })
    if (!ok) throw new Error(data?.message || "Failed to upload image.")
    return { image: data.url, publicId: data.publicId }
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError("")
    const { ok, data } = await apiGet("/api/products")
    if (ok) {
      setProducts((data.products || []).map(normalizeProduct))
    } else {
      setError(data?.message || "Failed to load products.")
    }
    setLoading(false)
  }, [])

  const addProduct = useCallback(
    async (payload) => {
      setError("")
      const uploaded = await uploadToCloudinaryIfNeeded({ image: payload.image, publicId: payload.publicId })
      const body = { ...payload, image: uploaded.image, publicId: uploaded.publicId }

      const { ok, data } = await apiPost("/api/products", body)
      if (!ok) throw new Error(data?.message || "Failed to create product.")
      const created = normalizeProduct(data.product)
      setProducts((prev) => [created, ...prev])
      return created
    },
    [uploadToCloudinaryIfNeeded]
  )

  const updateProduct = useCallback(
    async (id, payload) => {
      setError("")
      const uploaded = await uploadToCloudinaryIfNeeded({ image: payload.image, publicId: payload.publicId })
      const body = { ...payload, image: uploaded.image, publicId: uploaded.publicId }

      const { ok, data } = await apiPut(`/api/products/${id}`, body)
      if (!ok) throw new Error(data?.message || "Failed to update product.")
      const updated = normalizeProduct(data.product)
      setProducts((prev) => prev.map((p) => (p.id === id || p._id === id ? updated : p)))
      return updated
    },
    [uploadToCloudinaryIfNeeded]
  )

  const deleteProduct = useCallback(async (id) => {
    setError("")
    const { ok, data } = await apiDelete(`/api/products/${id}`)
    if (!ok) throw new Error(data?.message || "Failed to delete product.")
    setProducts((prev) => prev.filter((p) => p.id !== id && p._id !== id))
    return true
  }, [])

  const getProductById = useCallback(
    (id) => products.find((p) => p.id === id),
    [products]
  )

  return (
    <ProductsContext.Provider
      value={{
        products,
        loading,
        error,
        fetchProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        getProductById,
      }}
    >
      {children}
    </ProductsContext.Provider>
  )
}

export function useProducts() {
  const ctx = useContext(ProductsContext)
  if (!ctx) throw new Error('useProducts must be used within ProductsProvider')
  return ctx
}
