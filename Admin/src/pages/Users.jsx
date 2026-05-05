import React, { useState, useMemo } from "react"
import { Search } from "lucide-react"

const MOCK_USERS = [
  { id: "1", email: "ahmed@example.com", name: "Ahmed Ali", plan: "Premium", createdAt: "2024-01-15", lastLogin: "2024-06-01", status: "Active" },
  { id: "2", email: "sara@example.com", name: "Sara Mohammed", plan: "Beta", createdAt: "2024-02-20", lastLogin: "2024-05-28", status: "Active" },
  { id: "3", email: "omar@example.com", name: "Omar Hassan", plan: "Enterprise", createdAt: "2024-03-10", lastLogin: "2024-06-02", status: "Active" },
  { id: "4", email: "fatima@example.com", name: "Fatima Khan", plan: "Premium", createdAt: "2024-04-05", lastLogin: "2024-05-15", status: "Inactive" },
  { id: "5", email: "khalid@example.com", name: "Khalid Ibrahim", plan: "Beta", createdAt: "2024-05-12", lastLogin: "2024-06-03", status: "Active" },
]

export default function Users() {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const q = (search || "").toLowerCase().trim()
    if (!q) return MOCK_USERS
    return MOCK_USERS.filter(
      (u) =>
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.plan && u.plan.toLowerCase().includes(q))
    )
  }, [search])

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Users</h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by email, name, plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-[var(--admin-border)] bg-slate-50 dark:bg-[var(--admin-surface)] text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/20"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-[var(--admin-border)] bg-white dark:bg-[var(--admin-surface)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-[var(--admin-primary)]/20 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Last login</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[var(--admin-border)]">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-[var(--admin-surface)]">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-[var(--admin-border)] text-slate-700 dark:text-slate-300">
                      {u.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.createdAt}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.lastLogin}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.status === "Active"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-600 dark:bg-[var(--admin-border)] dark:text-slate-400"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No users match your search.</div>
        )}
      </div>
    </div>
  )
}
