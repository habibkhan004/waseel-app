import React, { useState } from "react"
import { Key, Eye, EyeOff, Check, Save, Plus, Trash2 } from "lucide-react"
import { useApiConfig } from "../context/ApiConfigContext"

function SecretInput({ value, onChange, placeholder, label }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-[var(--admin-border)] bg-slate-50 dark:bg-[var(--admin-primary)] text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/20"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          aria-label={show ? "Hide" : "Show"}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  )
}

function ApiCard({ id, label, apiName, apiKey, apiSecret, baseUrl, enabled, isCustom, onUpdate, onDelete }) {
  const [name, setName] = useState(apiName ?? label ?? "")
  const [key, setKey] = useState(apiKey ?? "")
  const [secret, setSecret] = useState(apiSecret ?? "")
  const [url, setUrl] = useState(baseUrl ?? "")
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    onUpdate(id, {
      apiName: name || label,
      apiKey: key,
      apiSecret: secret,
      baseUrl: url,
      enabled,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const displayLabel = label || apiName || name || id

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-[var(--admin-border)] bg-white dark:bg-[var(--admin-surface)] p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-[var(--admin-border)] flex items-center justify-center flex-shrink-0">
            <Key className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="min-w-0">
            {isCustom ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="API name"
                className="w-full font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-[var(--admin-border)] focus:border-[var(--admin-primary)] focus:outline-none text-lg"
              />
            ) : (
              <h3 className="font-bold text-slate-900 dark:text-white truncate">{displayLabel}</h3>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">{id}</p>
          </div>
        </div>
        {isCustom && (
          <button
            type="button"
            onClick={() => onDelete(id)}
            className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 flex-shrink-0"
            title="Remove API"
            aria-label="Remove API"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
      <div className="space-y-4">
        {isCustom && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              API Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name for this API"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[var(--admin-border)] bg-slate-50 dark:bg-[var(--admin-primary)] text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/20"
            />
          </div>
        )}
        <SecretInput
          label="API Key"
          value={key}
          onChange={setKey}
          placeholder="sk-... or your API key"
        />
        <SecretInput
          label="API Secret"
          value={secret}
          onChange={setSecret}
          placeholder="Optional — leave blank if not used"
        />
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Base URL <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[var(--admin-border)] bg-slate-50 dark:bg-[var(--admin-primary)] text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/20"
          />
        </div>
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onUpdate(id, { enabled: e.target.checked })}
              className="rounded border-slate-300 dark:border-[var(--admin-border)] text-[var(--admin-primary)] focus:ring-[var(--admin-primary)]/20"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Enabled</span>
          </label>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--admin-primary)] dark:bg-white text-white dark:text-[var(--admin-primary)] text-sm font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ApiManagement() {
  const { config, customIds, builtinIds, updateProvider, addProvider, removeProvider } = useApiConfig()
  const [addName, setAddName] = useState("")
  const [showAdd, setShowAdd] = useState(false)

  const handleAddApi = () => {
    const name = addName.trim() || "New API"
    addProvider(name)
    setAddName("")
    setShowAdd(false)
  }

  const allIds = [...builtinIds, ...customIds]

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-in">
      <p className="text-slate-600 dark:text-slate-400 text-sm max-w-2xl">
        Manage API keys and endpoints. Use <strong>API Name</strong> for display, <strong>API Key</strong> and optional <strong>API Secret</strong> where required. You can add custom APIs and remove them anytime.
      </p>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Configured APIs</h2>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-[var(--admin-border)] text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-[var(--admin-surface)] transition-colors"
        >
          <Plus size={18} />
          Add API
        </button>
      </div>

      {showAdd && (
        <div className="rounded-2xl border border-slate-200 dark:border-[var(--admin-border)] bg-white dark:bg-[var(--admin-surface)] p-5 flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              API name
            </label>
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="e.g. My Custom Service"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[var(--admin-border)] bg-slate-50 dark:bg-[var(--admin-primary)] text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/20"
              onKeyDown={(e) => e.key === "Enter" && handleAddApi()}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddApi}
              className="px-4 py-2.5 rounded-xl bg-[var(--admin-primary)] dark:bg-white text-white dark:text-[var(--admin-primary)] font-semibold text-sm hover:opacity-90"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setAddName("") }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[var(--admin-border)] text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-[var(--admin-surface)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
        {allIds.map((id) => {
          const provider = config[id] ?? {}
          const isCustom = customIds.includes(id)
          const label = provider.label || provider.apiName || id
          return (
            <ApiCard
              key={id}
              id={id}
              label={label}
              apiName={provider.apiName}
              apiKey={provider.apiKey}
              apiSecret={provider.apiSecret}
              baseUrl={provider.baseUrl}
              enabled={provider.enabled !== false}
              isCustom={isCustom}
              onUpdate={updateProvider}
              onDelete={removeProvider}
            />
          )
        })}
      </div>
    </div>
  )
}
