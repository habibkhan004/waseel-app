import React, { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Lock, Sparkles, Eye, EyeOff, AlertCircle } from "lucide-react"
import { useAdminAuth } from "../context/AdminAuthContext"

export default function Login() {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { login, isAuthenticated } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || "/"

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated, from, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    if (!password.trim()) {
      setError("Enter your password")
      return
    }
    setSubmitting(true)
    const result = await login(password.trim())
    setSubmitting(false)
    if (result.success) {
      navigate(from, { replace: true })
    } else {
      setError(result.error || "Invalid password")
      setPassword("")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[var(--admin-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 dark:border-[var(--admin-border)] bg-white dark:bg-[var(--admin-surface)] shadow-xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="h-14 w-14 rounded-2xl bg-[var(--admin-primary)] dark:bg-white flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-white dark:text-[var(--admin-primary)]" />
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">Waseel Admin</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sign in to the dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 text-sm">
                <AlertCircle size={18} className="flex-shrink-0" />
                {error}
              </div>
            )}
            <div>
              <label htmlFor="admin-password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                  autoFocus
                  disabled={submitting}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 dark:border-[var(--admin-border)] bg-slate-50 dark:bg-[var(--admin-primary)] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/30 focus:border-[var(--admin-primary)] disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[var(--admin-primary)] dark:bg-white text-white dark:text-[var(--admin-primary)] font-bold hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Session expires after 24 hours or when you close the tab.
          </p>
        </div>
      </div>
    </div>
  )
}
