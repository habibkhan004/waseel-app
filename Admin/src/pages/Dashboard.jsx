import React from "react"
import { Link } from "react-router-dom"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { Users, CreditCard, TrendingUp, Activity } from "lucide-react"

const chartData = [
  { name: "Jan", signups: 120, revenue: 12 },
  { name: "Feb", signups: 180, revenue: 18 },
  { name: "Mar", signups: 220, revenue: 24 },
  { name: "Apr", signups: 190, revenue: 22 },
  { name: "May", signups: 280, revenue: 30 },
  { name: "Jun", signups: 320, revenue: 35 },
]

const stats = {
  totalUsers: 1248,
  activeSubscriptions: 892,
  mrr: 45600,
  supportOpen: 12,
  plans: { beta: 420, premium: 380, enterprise: 92 },
}

function formatMRR(value) {
  if (value >= 1000) return `SAR ${(value / 1000).toFixed(1)}K`
  return `SAR ${value}`
}

const statCards = [
  { label: "Total Users", value: stats.totalUsers.toLocaleString(), icon: Users, color: "bg-blue-500" },
  { label: "Active Subscriptions", value: stats.activeSubscriptions.toLocaleString(), icon: CreditCard, color: "bg-emerald-500" },
  { label: "MRR", value: formatMRR(stats.mrr), icon: TrendingUp, color: "bg-amber-500" },
  { label: "Support Open", value: String(stats.supportOpen), icon: Activity, color: "bg-slate-500" },
]

const planDistribution = [
  { name: "Beta", count: stats.plans.beta },
  { name: "Premium", count: stats.plans.premium },
  { name: "Enterprise", count: stats.plans.enterprise },
]

export default function Dashboard() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon
          return (
            <div
              key={s.label}
              className="rounded-2xl border border-slate-200 dark:border-[var(--admin-border)] bg-white dark:bg-[var(--admin-surface)] p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{s.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-xl ${s.color} flex items-center justify-center text-white`}>
                  <Icon size={20} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-[var(--admin-border)] bg-white dark:bg-[var(--admin-surface)] p-5 md:p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Sign-ups & Revenue</h2>
        <div className="h-64 md:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--admin-surface)",
                  border: "1px solid var(--admin-border)",
                  borderRadius: "12px",
                }}
                labelStyle={{ color: "#fff" }}
              />
              <Bar dataKey="signups" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Sign-ups" />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue (K)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 dark:border-[var(--admin-border)] bg-white dark:bg-[var(--admin-surface)] p-5 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-white mb-3">Plan distribution</h3>
          <ul className="space-y-3">
            {planDistribution.map((item) => (
              <li key={item.name} className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">{item.name}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{item.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-[var(--admin-border)] bg-white dark:bg-[var(--admin-surface)] p-5 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-white mb-3">Quick actions</h3>
          <div className="flex flex-wrap gap-2">
            <Link to="/users" className="px-4 py-2 rounded-lg bg-[var(--admin-primary)] text-white text-sm font-semibold hover:opacity-90">View users</Link>
            <Link to="/plans" className="px-4 py-2 rounded-lg border border-slate-300 dark:border-[var(--admin-border)] text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-[var(--admin-surface)]">Plans</Link>
            <Link to="/analytics" className="px-4 py-2 rounded-lg border border-slate-300 dark:border-[var(--admin-border)] text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-[var(--admin-surface)]">Analytics</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
