import { useEffect, useMemo, useState } from "react"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { useServices } from "../context/ServicesContext"

const CURRENCIES = ["SAR", "AED", "USD", "EUR", "GBP"]

function formatPrice(price, currency) {
  const p = String(price ?? "").trim()
  const c = String(currency || "SAR").trim()
  if (!p) return "-"
  return `${c} ${p}`
}

function ServiceForm({ initial, onSubmit, onCancel, disabled }) {
  const [name, setName] = useState(initial?.name || "")
  const [description, setDescription] = useState(initial?.description || "")
  const [category, setCategory] = useState(initial?.category || "")
  const [price, setPrice] = useState(initial?.price || "")
  const [currency, setCurrency] = useState(initial?.currency || "SAR")
  const [availability, setAvailability] = useState(initial?.availability ?? true)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    if (!name.trim() || !category.trim() || !String(price).trim()) {
      setError("Name, category, and price are required.")
      return
    }
    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      price: String(price).trim(),
      currency,
      availability,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[var(--dark-blue-3)] bg-slate-50 dark:bg-[var(--dark-blue-2)] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Category</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[var(--dark-blue-3)] bg-slate-50 dark:bg-[var(--dark-blue-2)] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20"
            disabled={disabled}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[var(--dark-blue-3)] bg-slate-50 dark:bg-[var(--dark-blue-2)] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20"
          disabled={disabled}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Price</label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[var(--dark-blue-3)] bg-slate-50 dark:bg-[var(--dark-blue-2)] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[var(--dark-blue-3)] bg-slate-50 dark:bg-[var(--dark-blue-2)] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20"
            disabled={disabled}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input
          type="checkbox"
          checked={availability}
          onChange={(e) => setAvailability(e.target.checked)}
          disabled={disabled}
        />
        Available
      </label>

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--dark-blue)] text-white px-4 py-2.5 font-bold text-sm hover:opacity-90 dark:bg-white dark:text-[var(--dark-blue)] disabled:opacity-60"
        >
          {disabled ? <Loader2 size={18} className="animate-spin" /> : null}
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="rounded-xl border border-slate-200 dark:border-[var(--dark-blue-3)] px-4 py-2.5 font-bold text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[var(--dark-blue-2)] disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function ManageServices() {
  const { services, loading, error, fetchServices, addService, updateService, deleteService } = useServices()
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState("")

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return services
    return services.filter((s) => {
      const name = (s?.name || "").toLowerCase()
      const category = (s?.category || "").toLowerCase()
      return name.includes(q) || category.includes(q)
    })
  }, [services, search])

  const openAdd = () => {
    setEditing(null)
    setSubmitError("")
    setModalOpen(true)
  }

  const openEdit = (s) => {
    setEditing(s)
    setSubmitError("")
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
    setEditing(null)
  }

  const handleSubmit = async (payload) => {
    setSaving(true)
    setSubmitError("")
    try {
      if (editing?._id) await updateService(editing._id, payload)
      else await addService(payload)
      setModalOpen(false)
      setEditing(null)
    } catch (e) {
      setSubmitError(e?.message || "Failed to save.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this service?")) return
    setSubmitError("")
    setSaving(true)
    try {
      await deleteService(id)
    } catch (e) {
      setSubmitError(e?.message || "Failed to delete.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">Manage Services</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create, edit, and remove services.</p>
        </div>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20 dark:bg-[var(--dark-blue-2)] dark:border-[var(--dark-blue-3)] dark:text-white"
          />
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--dark-blue)] text-white px-4 py-2.5 font-bold text-sm hover:opacity-90 dark:bg-white dark:text-[var(--dark-blue)]"
          >
            <Plus size={18} />
            Add
          </button>
        </div>
      </div>

      {submitError ? <div className="text-sm text-red-600 dark:text-red-400">{submitError}</div> : null}
      {loading ? <div className="text-sm text-slate-500 dark:text-slate-400">Loading…</div> : null}
      {error ? <div className="text-sm text-red-600 dark:text-red-400">{error}</div> : null}

      <div className="bg-white dark:bg-[var(--dark-blue)] border border-slate-200 dark:border-[var(--dark-blue-3)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-[var(--dark-blue-2)]">
              <tr className="text-left text-slate-600 dark:text-slate-300">
                <th className="px-4 py-3 font-black">Name</th>
                <th className="px-4 py-3 font-black">Category</th>
                <th className="px-4 py-3 font-black">Price</th>
                <th className="px-4 py-3 font-black">Availability</th>
                <th className="px-4 py-3 font-black w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[var(--dark-blue-3)]">
              {filtered.map((s) => (
                <tr key={s._id} className="text-slate-700 dark:text-slate-200">
                  <td className="px-4 py-3 font-semibold">{s.name || "Untitled"}</td>
                  <td className="px-4 py-3">{s.category || "-"}</td>
                  <td className="px-4 py-3 font-black">{formatPrice(s.price, s.currency)}</td>
                  <td className="px-4 py-3">{s.availability ? "Available" : "Unavailable"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[var(--dark-blue-2)]"
                        aria-label="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s._id)}
                        className="p-2 rounded-xl hover:bg-red-50 text-red-600 dark:hover:bg-red-900/30 dark:text-red-300"
                        aria-label="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500 dark:text-slate-400" colSpan={5}>
                    No services found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[var(--dark-blue)] border border-slate-200 dark:border-[var(--dark-blue-3)] p-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {editing ? "Edit service" : "Add service"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Name, description, category, price, currency, availability.
            </p>
            {submitError ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{submitError}</p> : null}
            <div className="mt-4">
              <ServiceForm initial={editing} onSubmit={handleSubmit} onCancel={closeModal} disabled={saving} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

