import React, { useState, useEffect } from "react"
import { X } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useAuthModal } from "../context/AuthModalContext"

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export default function AuthModal() {
  const { isOpen, mode: contextMode, plan: contextPlan, close } = useAuthModal()
  const [mode, setMode] = useState(contextMode)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [loading, setLoading] = useState(false)
  const {
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    requestPasswordReset,
    isGoogleOAuth,
  } = useAuth()

  useEffect(() => {
    if (isOpen) setMode(contextMode)
  }, [isOpen, contextMode])

  const plan = contextPlan || "beta"

  const reset = () => {
    setError("")
    setInfo("")
    setName("")
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setLoading(false)
  }

  const handleClose = () => {
    reset()
    close()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setInfo("")

    if (mode === "forgot") {
      if (!email.trim()) {
        setError("Please enter your email.")
        return
      }
      setLoading(true)
      try {
        const { message, error: err } = await requestPasswordReset(email.trim())
        if (err) {
          setError(err.message || "Failed to start password reset.")
        } else {
          setInfo(message || "If that email exists, a reset link has been sent.")
        }
      } catch (err) {
        setError(err?.message || "Failed to start password reset.")
      } finally {
        setLoading(false)
      }
      return
    }

    if (!email.trim()) {
      setError("Please enter your email.")
      return
    }
    if (!password) {
      setError("Please enter your password.")
      return
    }
    if (mode === "signup") {
      if (password.length < 6) {
        setError("Password must be at least 6 characters.")
        return
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.")
        return
      }
    }
    setLoading(true)
    try {
      if (mode === "signup") {
        const { error: err } = await signUpWithEmail(email.trim(), password, plan, name.trim())
        if (err) setError(err.message || "Sign up failed.")
        else handleClose()
      } else {
        const { error: err } = await signInWithEmail(email.trim(), password)
        if (err) setError(err.message || "Invalid email or password.")
        else handleClose()
      }
    } catch (err) {
      setError(err?.message || "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = () => {
    setError("")
    setInfo("")
    setLoading(true)
    const result = signInWithGoogle(plan)
    if (result?.error) {
      setError(result.error.message || "Google sign-in failed.")
      setLoading(false)
    } else if (!isGoogleOAuth) {
      // If Google isn't really configured, we won't redirect
      setLoading(false)
    }
    // If isGoogleOAuth, page will redirect to Google; keep loading state
  }

  if (!isOpen) return null

  const modalTitle =
    mode === "forgot" ? "Forgot password" :
    mode === "login" ? "Log in" : "Create account"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" onClick={handleClose} aria-hidden />
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue-2)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="auth-modal-title" className="text-xl font-black text-slate-900 dark:text-white">
            {modalTitle}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-[var(--dark-blue-3)] dark:text-slate-400"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}
        {info && !error && (
          <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            {info}
          </div>
        )}

        {/* Google sign-in option (always visible) */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-slate-200 bg-white py-3 px-4 text-slate-800 font-bold hover:bg-slate-50 disabled:opacity-50 dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue)] dark:text-white dark:hover:bg-[var(--dark-blue-3)]"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-4">
          <span className="flex-1 h-px bg-slate-200 dark:bg-[var(--dark-blue-3)]" />
          <span className="text-sm text-slate-500 dark:text-slate-400">or</span>
          <span className="flex-1 h-px bg-slate-200 dark:bg-[var(--dark-blue-3)]" />
        </div>

        {mode === "forgot" ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="auth-forgot-email" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  id="auth-forgot-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20 focus:border-[var(--dark-blue)] dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue)] dark:text-white dark:placeholder:text-slate-500"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[var(--dark-blue)] py-3 px-4 font-bold text-white hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-[var(--dark-blue)]"
              >
                {loading ? "Please wait…" : "Send reset link"}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
              Remembered your password?{" "}
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); setInfo(""); }}
                className="font-bold text-[var(--dark-blue)] dark:text-white hover:underline"
              >
                Back to log in
              </button>
            </p>
          </>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label htmlFor="auth-name" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20 focus:border-[var(--dark-blue)] dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue)] dark:text-white dark:placeholder:text-slate-500"
                    placeholder="Your name"
                  />
                </div>
              )}
              <div>
                <label htmlFor="auth-email" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20 focus:border-[var(--dark-blue)] dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue)] dark:text-white dark:placeholder:text-slate-500"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="auth-password" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20 focus:border-[var(--dark-blue)] dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue)] dark:text-white dark:placeholder:text-slate-500"
                  placeholder={mode === "login" ? "Your password" : "At least 6 characters"}
                />
              </div>
              {mode === "signup" && (
                <div>
                  <label htmlFor="auth-confirm" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm password
                  </label>
                  <input
                    id="auth-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20 focus:border-[var(--dark-blue)] dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue)] dark:text-white dark:placeholder:text-slate-500"
                    placeholder="Confirm password"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[var(--dark-blue)] py-3 px-4 font-bold text-white hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-[var(--dark-blue)]"
              >
                {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
              {mode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("signup"); setError(""); setInfo(""); }}
                    className="font-bold text-[var(--dark-blue)] dark:text-white hover:underline"
                  >
                    Sign up
                  </button>
                  <br />
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); setError(""); setInfo(""); }}
                    className="mt-2 font-bold text-xs text-slate-500 hover:underline dark:text-slate-300"
                  >
                    Forgot your password?
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("login"); setError(""); setInfo(""); }}
                    className="font-bold text-[var(--dark-blue)] dark:text-white hover:underline"
                  >
                    Log in
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
