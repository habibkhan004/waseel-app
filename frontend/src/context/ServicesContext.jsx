import { createContext, useContext, useState, useCallback } from "react"
import { apiDelete, apiGet, apiPost, apiPut } from "../lib/api"

const ServicesContext = createContext(null)

export function ServicesProvider({ children }) {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const fetchServices = useCallback(async () => {
    setLoading(true)
    setError("")
    const { ok, data } = await apiGet("/api/services")
    if (ok) {
      setServices(data.services || [])
    } else {
      setError(data?.message || "Failed to load services.")
    }
    setLoading(false)
  }, [])

  const addService = useCallback(async (payload) => {
    setError("")
    const { ok, data } = await apiPost("/api/services", payload)
    if (!ok) throw new Error(data?.message || "Failed to create service.")
    const created = data.service
    setServices((prev) => [created, ...prev])
    return created
  }, [])

  const updateService = useCallback(async (id, payload) => {
    setError("")
    const { ok, data } = await apiPut(`/api/services/${id}`, payload)
    if (!ok) throw new Error(data?.message || "Failed to update service.")
    const updated = data.service
    setServices((prev) => prev.map((s) => (s._id === id ? updated : s)))
    return updated
  }, [])

  const deleteService = useCallback(async (id) => {
    setError("")
    const { ok, data } = await apiDelete(`/api/services/${id}`)
    if (!ok) throw new Error(data?.message || "Failed to delete service.")
    setServices((prev) => prev.filter((s) => s._id !== id))
    return true
  }, [])

  const getServiceById = useCallback((id) => services.find((s) => s._id === id), [services])

  return (
    <ServicesContext.Provider
      value={{
        services,
        loading,
        error,
        fetchServices,
        addService,
        updateService,
        deleteService,
        getServiceById,
      }}
    >
      {children}
    </ServicesContext.Provider>
  )
}

export function useServices() {
  const ctx = useContext(ServicesContext)
  if (!ctx) throw new Error("useServices must be used within ServicesProvider")
  return ctx
}

