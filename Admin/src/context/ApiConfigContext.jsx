import { createContext, useContext, useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "admin_api_config"
const CUSTOM_IDS_KEY = "admin_api_custom_ids"

const BUILTIN_APIS = {
  claude: { apiName: "", apiKey: "", apiSecret: "", baseUrl: "", enabled: true, label: "Claude (Anthropic)" },
  openai: { apiName: "", apiKey: "", apiSecret: "", baseUrl: "", enabled: true, label: "OpenAI" },
  runway: { apiName: "", apiKey: "", apiSecret: "", baseUrl: "", enabled: true, label: "Runway ML" },
  meta: { apiName: "", apiKey: "", apiSecret: "", baseUrl: "", enabled: true, label: "Meta" },
  elevenlabs: { apiName: "", apiKey: "", apiSecret: "", baseUrl: "", enabled: true, label: "ElevenLabs" },
}

const defaultProvider = () => ({
  apiName: "",
  apiKey: "",
  apiSecret: "",
  baseUrl: "",
  enabled: true,
  label: "",
})

function loadCustomIds() {
  try {
    const raw = localStorage.getItem(CUSTOM_IDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const builtin = { ...BUILTIN_APIS }
    if (!raw) return { config: builtin, customIds: [] }
    const parsed = JSON.parse(raw)
    const storedCustomIds = loadCustomIds()
    const merged = { ...builtin }
    for (const [id, data] of Object.entries(parsed)) {
      if (builtin[id]) {
        merged[id] = { ...BUILTIN_APIS[id], ...builtin[id], ...data }
      } else {
        merged[id] = { ...defaultProvider(), ...data }
      }
    }
    const fromConfig = Object.keys(parsed).filter((k) => !BUILTIN_APIS[k])
    const customIds = [...new Set([...storedCustomIds, ...fromConfig])]
    return { config: merged, customIds }
  } catch {
    return { config: { ...BUILTIN_APIS }, customIds: [] }
  }
}

function saveConfig(config, customIds) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    localStorage.setItem(CUSTOM_IDS_KEY, JSON.stringify(customIds))
  } catch (e) {
    console.warn("Failed to save API config", e)
  }
}

function generateCustomId() {
  return "custom-" + (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36))
}

const ApiConfigContext = createContext(null)

export function ApiConfigProvider({ children }) {
  const [state, setState] = useState(loadConfig)
  const { config, customIds } = state

  useEffect(() => {
    saveConfig(config, customIds)
  }, [config, customIds])

  const updateProvider = useCallback((providerId, data) => {
    setState((prev) => {
      const existing = prev.config[providerId] ?? defaultProvider()
      return {
        ...prev,
        config: {
          ...prev.config,
          [providerId]: { ...existing, ...data },
        },
      }
    })
  }, [])

  const addProvider = useCallback((name) => {
    const id = generateCustomId()
    setState((prev) => ({
      ...prev,
      customIds: [...prev.customIds, id],
      config: {
        ...prev.config,
        [id]: { ...defaultProvider(), apiName: name || "New API", label: name || "New API" },
      },
    }))
    return id
  }, [])

  const removeProvider = useCallback((providerId) => {
    if (BUILTIN_APIS[providerId]) return
    setState((prev) => ({
      ...prev,
      customIds: prev.customIds.filter((c) => c !== providerId),
      config: (() => {
        const next = { ...prev.config }
        delete next[providerId]
        return next
      })(),
    }))
  }, [])

  const value = {
    config,
    customIds,
    builtinIds: Object.keys(BUILTIN_APIS),
    updateProvider,
    addProvider,
    removeProvider,
  }

  return (
    <ApiConfigContext.Provider value={value}>
      {children}
    </ApiConfigContext.Provider>
  )
}

export function useApiConfig() {
  const ctx = useContext(ApiConfigContext)
  if (!ctx) throw new Error("useApiConfig must be used within ApiConfigProvider")
  return ctx
}
