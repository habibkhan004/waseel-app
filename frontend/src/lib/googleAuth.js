/**
 * Google OAuth 2.0 (client-side redirect flow).
 * Set VITE_GOOGLE_CLIENT_ID in .env to enable. Get it from Google Cloud Console:
 * APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application).
 * Add authorized redirect URI: http://localhost:5173/ (and your production URL).
 */

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const REDIRECT_URI = typeof window !== 'undefined' ? window.location.origin + '/' : ''
const OAUTH_PLAN_KEY = 'waseel_oauth_plan'

export function isGoogleConfigured() {
  return !!GOOGLE_CLIENT_ID
}

export function getGoogleAuthUrl() {
  if (!GOOGLE_CLIENT_ID) return null
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'token',
    scope: 'openid email profile',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export function savePlanForOAuth(plan) {
  if (typeof window !== 'undefined') sessionStorage.setItem(OAUTH_PLAN_KEY, plan)
}

export function getPlanFromOAuth() {
  if (typeof window === 'undefined') return 'beta'
  const plan = sessionStorage.getItem(OAUTH_PLAN_KEY)
  sessionStorage.removeItem(OAUTH_PLAN_KEY)
  return plan || 'beta'
}

export function parseHashParams() {
  if (typeof window === 'undefined' || !window.location.hash) return null
  const hash = window.location.hash.slice(1)
  const params = new URLSearchParams(hash)
  const accessToken = params.get('access_token')
  return accessToken ? { accessToken } : null
}

export async function fetchGoogleUserInfo(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch user info')
  return res.json()
}
