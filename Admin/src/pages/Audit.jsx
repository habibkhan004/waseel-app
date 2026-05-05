import React from "react"
import { Shield, Clock, User } from "lucide-react"

const logs = [
  { action: "Admin login", user: "admin@waseel.sa", time: "2025-03-01 10:32", ip: "192.168.1.1" },
  { action: "User plan changed", user: "support@waseel.sa", time: "2025-03-01 09:15", ip: "192.168.1.1" },
  { action: "User suspended", user: "admin@waseel.sa", time: "2025-02-28 16:45", ip: "192.168.1.1" },
]

export default function Audit() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-[var(--admin-primary)] dark:bg-white flex items-center justify-center">
          <Shield className="h-6 w-6 text-white dark:text-[var(--admin-primary)]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Audit & Security</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Recent admin actions and security events</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-[var(--admin-border)] bg-white dark:bg-[var(--admin-surface)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[var(--admin-border)] bg-slate-50 dark:bg-[var(--admin-primary)]/50">
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Action</th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden sm:table-cell">User</th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock size={12} /> Time
                </th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden md:table-cell">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-[var(--admin-border)] hover:bg-slate-50 dark:hover:bg-[var(--admin-surface)]/80">
                  <td className="px-4 py-4 font-medium text-slate-900 dark:text-white">{log.action}</td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-400 hidden sm:table-cell">
                  <span className="inline-flex items-center gap-2">
                    <User size={14} /> {log.user}
                  </span>
                </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-400 text-sm">{log.time}</td>
                  <td className="px-4 py-4 text-slate-500 dark:text-slate-500 text-sm hidden md:table-cell">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
