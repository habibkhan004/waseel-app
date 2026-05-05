import React, { useState } from "react"
import { CreditCard, Save, Check, Pencil } from "lucide-react"
import { usePlans } from "../context/PlansContext"

function PlanCard({ plan, onSave }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(plan.name ?? "")
  const [price, setPrice] = useState(plan.price ?? "")
  const [details, setDetails] = useState(plan.details ?? "")
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    onSave(plan.id, {
      name: name.trim() || plan.name,
      price: price.trim() || plan.price,
      details: details.trim() || plan.details,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setEditing(false)
  }

  const handleCancel = () => {
    setName(plan.name ?? "")
    setPrice(plan.price ?? "")
    setDetails(plan.details ?? "")
    setEditing(false)
  }

  const displayName = name.trim() || plan.name || plan.id
  const displayPrice = price.trim() || plan.price
  const displayDetails = details.trim() || plan.details

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-[var(--admin-border)] bg-white dark:bg-[var(--admin-surface)] p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-12 w-12 rounded-xl bg-[var(--admin-primary)] dark:bg-white flex items-center justify-center flex-shrink-0">
          <CreditCard className="h-6 w-6 text-white dark:text-[var(--admin-primary)]" />
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-[var(--admin-primary)] border border-slate-200 dark:border-[var(--admin-border)] rounded-lg px-3 py-1.5 text-lg focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/20"
              placeholder="Plan name"
            />
          ) : (
            <h3 className="font-bold text-slate-900 dark:text-white truncate">{displayName}</h3>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{plan.id}</p>
        </div>
      </div>

      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Price
            </label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. Free, SAR 99/mo, Custom"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[var(--admin-border)] bg-slate-50 dark:bg-[var(--admin-primary)] text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/20"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Details
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Features, limits, description..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[var(--admin-border)] bg-slate-50 dark:bg-[var(--admin-primary)] text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/20 resize-y min-h-[80px]"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-[var(--admin-primary)] dark:bg-white text-white dark:text-[var(--admin-primary)] font-semibold text-sm hover:opacity-90 flex items-center justify-center gap-2"
            >
              {saved ? <Check size={16} /> : <Save size={16} />}
              {saved ? "Saved" : "Save"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[var(--admin-border)] text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-[var(--admin-surface)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-lg font-black text-slate-900 dark:text-white mb-2">{displayPrice}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line mb-5">
            {displayDetails || "—"}
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-[var(--admin-border)] text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-[var(--admin-surface)] flex items-center justify-center gap-2"
          >
            <Pencil size={16} />
            Edit
          </button>
        </>
      )}
    </div>
  )
}

export default function Plans() {
  const { plans, updatePlan } = usePlans()

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-in">
      <p className="text-slate-600 dark:text-slate-400 text-sm max-w-2xl">
        Edit plan name, price, and details. Click Edit on a plan to change it, then Save.
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onSave={updatePlan} />
        ))}
      </div>
    </div>
  )
}
