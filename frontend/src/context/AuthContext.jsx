import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  getGoogleAuthUrl,
  isGoogleConfigured,
  savePlanForOAuth,
  getPlanFromOAuth,
  parseHashParams,
  fetchGoogleUserInfo,
} from '../lib/googleAuth'

const PLAN_KEY = 'waseel_selected_plan'
const LOCAL_SESSION_KEY = 'waseel_local_session'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

function getLocalSession() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setLocalSession(session) {
  if (typeof window === 'undefined') return
  if (session) localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session))
  else localStorage.removeItem(LOCAL_SESSION_KEY)
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [selectedPlan, setSelectedPlanState] = useState(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(PLAN_KEY)
  })
  const [loading, setLoading] = useState(true)

  const setSelectedPlan = useCallback((plan) => {
    setSelectedPlanState(plan)
    if (typeof window !== 'undefined') {
      if (plan) localStorage.setItem(PLAN_KEY, plan)
      else localStorage.removeItem(PLAN_KEY)
    }
  }, [])

  // Restore session from localStorage or handle Google OAuth callback; optionally validate with backend
  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false)
      return
    }

    const hashParams = parseHashParams()
    if (hashParams) {
      setLoading(true)
      const plan = getPlanFromOAuth()
      fetchGoogleUserInfo(hashParams.accessToken)
        .then(async (info) => {
          const response = await fetch(`${API_BASE}/api/auth/google`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              googleId: info.id,
              email: info.email,
              name: info.name || info.email,
              picture: info.picture,
              plan,
            }),
          })

          const data = await response.json().catch(() => ({}))
          if (!response.ok || !data.user || !data.token) {
            return
          }

          const session = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            plan: data.user.plan,
            token: data.token,
          }
          setLocalSession(session)
          setUser(session)
        })
        .catch(() => {})
        .finally(() => {
          window.history.replaceState(null, '', window.location.pathname || '/')
          setLoading(false)
        })
      return
    }

    const local = getLocalSession()
    if (!local || !local.token) {
      setUser(null)
      setLoading(false)
      return
    }

    setUser({ email: local.email, id: local.id, plan: local.plan, name: local.name })

    // Optionally validate token and refresh user from backend
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${local.token}` }
    })
      .then((res) => {
        if (res.ok) return res.json()
        setLocalSession(null)
        setUser(null)
      })
      .then((data) => {
        if (data && data.user) {
          const u = data.user
          setUser({
            id: u.id,
            email: u.email,
            name: u.name,
            plan: u.plan,
            aiSettings: u.aiSettings,
            whatsapp: u.whatsapp,
            token: local.token
          })
          setLocalSession({ ...local, name: u.name, plan: u.plan })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const signUpWithEmail = useCallback(async (email, password, plan = 'beta', name) => {
    try {
      const displayName = (name && name.trim()) || email.split('@')[0] || email
      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: displayName,
          email,
          password,
          plan,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        return { user: null, error: { message: data.message || 'Sign up failed.' } }
      }

      const u = data.user
      const session = {
        id: u.id,
        email: u.email,
        name: u.name,
        plan: u.plan,
        token: data.token,
        aiSettings: u.aiSettings,
        whatsapp: u.whatsapp,
      }

      setLocalSession(session)
      setUser(session)

      return { user: data.user, error: null }
    } catch (err) {
      return { user: null, error: { message: err?.message || 'Sign up failed.' } }
    }
  }, [])

  const signInWithEmail = useCallback(async (email, password) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        return { error: { message: data.message || 'Invalid email or password.' } }
      }

      const u = data.user
      const session = {
        id: u.id,
        email: u.email,
        name: u.name,
        plan: u.plan,
        token: data.token,
        aiSettings: u.aiSettings,
        whatsapp: u.whatsapp,
      }

      setLocalSession(session)
      setUser(session)

      return { error: null }
    } catch (err) {
      return { error: { message: err?.message || 'Login failed.' } }
    }
  }, [])

  const requestPasswordReset = useCallback(async (email) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        return { error: { message: data.message || 'Failed to start password reset.' } }
      }
      return { message: data.message || 'If that email exists, a reset link has been sent.' }
    } catch (err) {
      return { error: { message: err?.message || 'Failed to start password reset.' } }
    }
  }, [])

  const resetPassword = useCallback(async (token, password) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        return { error: { message: data.message || 'Failed to reset password.' } }
      }
      return { message: data.message || 'Password has been reset successfully.' }
    } catch (err) {
      return { error: { message: err?.message || 'Failed to reset password.' } }
    }
  }, [])

  const signInWithGoogle = useCallback((plan = 'beta') => {
    if (isGoogleConfigured()) {
      savePlanForOAuth(plan)
      const url = getGoogleAuthUrl()
      if (url) window.location.href = url
      return { error: null }
    }
    return { error: { message: 'Google is not configured.' } }
  }, [])

  const signOut = useCallback(() => {
    setLocalSession(null)
    setUser(null)
    setSelectedPlanState(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PLAN_KEY)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    const local = getLocalSession()
    if (!local?.token) return
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${local.token}` }
      })
      if (!res.ok) return
      const data = await res.json()
      if (data?.user) {
        const u = data.user
        setUser({
          id: u.id,
          email: u.email,
          name: u.name,
          plan: u.plan,
          aiSettings: u.aiSettings,
          whatsapp: u.whatsapp,
          token: local.token
        })
        setLocalSession({ ...local, name: u.name, plan: u.plan, whatsapp: u.whatsapp })
      }
    } catch (_) {}
  }, [])

  const isAuthenticated = !!user

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        selectedPlan: user?.plan || selectedPlan,
        setSelectedPlan,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        requestPasswordReset,
        resetPassword,
        signOut,
        refreshUser,
        isGoogleOAuth: isGoogleConfigured(),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
