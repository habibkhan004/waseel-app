import { createContext, useContext, useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "admin_plans_config"

const DEFAULT_PLANS = {
  beta: {
    id: "beta",
    name: "Beta",
    price: "Free",
    details: "Core features, 100 messages/mo. Ideal for trying the platform.",
    subscribers: 1644,
  },
  premium: {
    id: "premium",
    name: "Premium",
    price: "SAR 99/mo",
    details: "Unlimited messages, Video ads, priority support.",
    subscribers: 892,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    details: "Dedicated support, API access, custom limits, SLA.",
    subscribers: 311,
  },
}

function loadPlans() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PLANS }
    const parsed = JSON.parse(raw)
    const merged = {}
    for (const id of Object.keys(DEFAULT_PLANS)) {
      merged[id] = { ...DEFAULT_PLANS[id], ...parsed[id] }
    }
    return merged
  } catch {
    return { ...DEFAULT_PLANS }
  }
}

function savePlans(plans) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans))
  } catch (e) {
    console.warn("Failed to save plans", e)
  }
}

const PlansContext = createContext(null)

export function PlansProvider({ children }) {
  const [plans, setPlans] = useState(loadPlans)

  useEffect(() => {
    savePlans(plans)
  }, [plans])

  const updatePlan = useCallback((planId, data) => {
    setPlans((prev) => {
      const existing = prev[planId]
      if (!existing) return prev
      return {
        ...prev,
        [planId]: { ...existing, ...data },
      }
    })
  }, [])

  const value = {
    plans: Object.values(plans),
    plansById: plans,
    updatePlan,
  }

  return (
    <PlansContext.Provider value={value}>
      {children}
    </PlansContext.Provider>
  )
}

export function usePlans() {
  const ctx = useContext(PlansContext)
  if (!ctx) throw new Error("usePlans must be used within PlansProvider")
  return ctx
}
