/**
 * Client-side admin auth (no backend).
 * Password is verified by comparing SHA-256 hash to a stored hash.
 */

const SESSION_KEY = "admin_session"
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

/** SHA-256 hash of password, returns hex string */
export async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

/** Stored hash from env, or default (hash of "Admin@123" - change in production via env) */
export function getStoredHash() {
  const fromEnv = import.meta.env.VITE_ADMIN_PASSWORD_HASH
  if (fromEnv && fromEnv.length === 64 && /^[a-f0-9]+$/i.test(fromEnv)) {
    return fromEnv.toLowerCase()
  }
  // Default dev hash = SHA-256("Admin@123"). For production set VITE_ADMIN_PASSWORD_HASH.
  return "e86f78a8a3caf0b60d8e74e5942aa6d86dc150cd3c03338aef25b7d2d7e3acc7"
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const data = JSON.parse(atob(raw))
    if (!data || typeof data.t !== "number" || !data.h) return null
    if (Date.now() - data.t > SESSION_MAX_AGE_MS) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    if (data.h !== getStoredHash()) return null
    return data
  } catch {
    return null
  }
}

export function setSession() {
  const payload = { t: Date.now(), h: getStoredHash() }
  sessionStorage.setItem(SESSION_KEY, btoa(JSON.stringify(payload)))
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

export async function verifyPassword(password) {
  const hash = await hashPassword(password)
  return hash === getStoredHash()
}
