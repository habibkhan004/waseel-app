import React from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { TrendingUp, Download } from "lucide-react"

const revenueData = [
  { month: "Jan", revenue: 32, users: 120 },
  { month: "Feb", revenue: 38, users: 180 },
  { month: "Mar", revenue: 45, users: 220 },
  { month: "Apr", revenue: 42, users: 190 },
  { month: "May", revenue: 52, users: 280 },
  { month: "Jun", revenue: 58, users: 320 },
]

export default function Analytics() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Revenue & usage</h2>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[var(--admin-border)] text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-[var(--admin-surface)]">
          <Download size={16} /> Export report
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-[var(--admin-border)] bg-white dark:bg-[var(--admin-surface)] p-5 md:p-6 shadow-sm">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--admin-surface)",
                  border: "1px solid var(--admin-border)",
                  borderRadius: "12px",
                }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue (K SAR)" />
              <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} name="New users" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-[var(--admin-border)] bg-white dark:bg-[var(--admin-surface)] p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp size={18} /> Funnel & retention
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Connect your analytics backend to see sign-up → trial → paid conversion and retention cohorts here.
        </p>
      </div>
    </div>
  )
}
