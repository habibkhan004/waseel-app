const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
const SESSION_KEY = "waseel_local_session"

export function getAuthToken() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    const session = raw ? JSON.parse(raw) : null
    return session?.token || null
  } catch {
    return null
  }
}

export async function apiFetch(path, options = {}) {
  const token = getAuthToken()
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  return res
}

async function parseJson(res) {
  return await res.json().catch(() => ({}))
}

export async function apiGet(path) {
  const res = await apiFetch(path)
  const data = await parseJson(res)
  return { ok: res.ok, data, status: res.status }
}

export async function apiPost(path, body) {
  const res = await apiFetch(path, { method: "POST", body: body ? JSON.stringify(body) : undefined })
  const data = await parseJson(res)
  return { ok: res.ok, data, status: res.status }
}

export async function apiPatch(path, body) {
  const res = await apiFetch(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined })
  const data = await parseJson(res)
  return { ok: res.ok, data, status: res.status }
}

export async function apiPut(path, body) {
  const res = await apiFetch(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined })
  const data = await parseJson(res)
  return { ok: res.ok, data, status: res.status }
}

export async function apiDelete(path) {
  const res = await apiFetch(path, { method: "DELETE" })
  const data = await parseJson(res)
  return { ok: res.ok, data, status: res.status }
}

