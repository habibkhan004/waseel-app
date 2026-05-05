import { useState } from "react"
import { Link, Navigate, useSearchParams } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token") || ""
  const { resetPassword } = useAuth()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [done, setDone] = useState(false)

  if (!token) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setInfo("")
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    setLoading(true)
    const result = await resetPassword(token, password)
    setLoading(false)
    if (result?.error) {
      setError(result.error.message || "Failed to reset password.")
      return
    }
    setInfo(result?.message || "Password has been reset successfully.")
    setDone(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[var(--dark-blue)] px-4">
      <div className="w-full max-w-md bg-white dark:bg-[var(--dark-blue-2)] border border-slate-200 dark:border-[var(--dark-blue-3)] rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Reset password</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Set a new password for your account.
        </p>

        {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        {info ? <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-300">{info}</p> : null}

        {!done ? (
          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[var(--dark-blue-3)] bg-slate-50 dark:bg-[var(--dark-blue-3)] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[var(--dark-blue-3)] bg-slate-50 dark:bg-[var(--dark-blue-3)] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[var(--dark-blue)] text-white py-3 font-black hover:opacity-90 dark:bg-white dark:text-[var(--dark-blue)] disabled:opacity-60"
            >
              {loading ? "Please wait…" : "Reset password"}
            </button>
            <div className="text-center text-sm text-slate-500 dark:text-slate-400">
              <Link to="/" className="font-bold text-[var(--dark-blue)] dark:text-white hover:underline">
                Back to home
              </Link>
            </div>
          </form>
        ) : (
          <div className="mt-5 text-sm text-slate-600 dark:text-slate-300">
            <Link to="/" className="font-bold text-[var(--dark-blue)] dark:text-white hover:underline">
              Go to login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

