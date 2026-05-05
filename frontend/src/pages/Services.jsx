import { useEffect, useMemo, useState } from "react"
import { Search, Mic } from "lucide-react"
import { useServices } from "../context/ServicesContext"

const CURRENCIES = ["SAR", "AED", "USD", "EUR", "GBP"]

function formatPrice(price, currency) {
  const p = String(price ?? "").trim()
  const c = String(currency || "SAR").trim()
  if (!p) return "-"
  return `${c} ${p}`
}

export default function Services() {
  const { services, loading, error, fetchServices } = useServices()
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return services
    return services.filter((s) => {
      const name = (s?.name || "").toLowerCase()
      const category = (s?.category || "").toLowerCase()
      const desc = (s?.description || "").toLowerCase()
      return name.includes(q) || category.includes(q) || desc.includes(q)
    })
  }, [services, search])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">Services</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Your service catalog with multi-currency support.
          </p>
        </div>
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services…"
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20 dark:bg-[var(--dark-blue-2)] dark:border-[var(--dark-blue-3)] dark:text-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500 dark:text-slate-400">Loading…</div>
      ) : error ? (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-slate-500 dark:text-slate-400">No services yet.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <div
              key={s._id}
              className="bg-white dark:bg-[var(--dark-blue)] border border-slate-200 dark:border-[var(--dark-blue-3)] rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-slate-900 dark:text-white truncate">{s.name || "Untitled"}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {s.category || "Uncategorized"}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                    s.availability
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-600 dark:bg-[var(--dark-blue-2)] dark:text-slate-300"
                  }`}
                >
                  {s.availability ? "Available" : "Unavailable"}
                </span>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 line-clamp-3">
                {s.description || "No description."}
              </p>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {formatPrice(s.price, CURRENCIES.includes(s.currency) ? s.currency : s.currency || "SAR")}
                </p>
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Mic size={14} />
                  AI ready
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

