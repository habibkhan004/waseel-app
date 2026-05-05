import { createContext, useContext, useState, useEffect, useCallback } from "react"
import {
  getSession,
  setSession,
  clearSession,
  verifyPassword,
} from "../lib/adminAuth"

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = getSession()
    setIsAuthenticated(!!session)
    setLoading(false)
  }, [])

  const login = useCallback(async (password) => {
    const ok = await verifyPassword(password)
    if (ok) {
      setSession()
      setIsAuthenticated(true)
      return { success: true }
    }
    return { success: false, error: "Invalid password" }
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setIsAuthenticated(false)
  }, [])

  const value = {
    isAuthenticated,
    loading,
    login,
    logout,
  }

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider")
  return ctx
}
