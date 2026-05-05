import React, { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BarChart3,
  Shield,
  Settings,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  LogOut,
  Key,
} from "lucide-react"
import { useAdminAuth } from "../context/AdminAuthContext"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "Users", path: "/users" },
  { icon: CreditCard, label: "Plans & Billing", path: "/plans" },
  { icon: Key, label: "API Management", path: "/api-management" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: Shield, label: "Audit & Security", path: "/audit" },
  { icon: Settings, label: "Settings", path: "/settings" },
]

export function AdminSidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout } = useAdminAuth()
  const [open, setOpen] = useState(false)

  const handleLogout = () => {
    logout()
    setOpen(false)
    navigate("/login", { replace: true })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 md:hidden h-10 w-10 rounded-xl bg-[var(--admin-primary)] text-white flex items-center justify-center shadow-lg"
        aria-label="Menu"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 bg-white dark:bg-[var(--admin-primary)] border-r border-slate-200 dark:border-[var(--admin-border)] transform transition-transform duration-200 ease-out md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full pt-14 md:pt-0">
          <div className="p-5 border-b border-slate-100 dark:border-[var(--admin-border)]">
            <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
              <div className="h-9 w-9 rounded-xl bg-[var(--admin-primary)] dark:bg-white flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white dark:text-[var(--admin-primary)]" />
              </div>
              <div>
                <span className="font-black text-slate-900 dark:text-white">Waseel</span>
                <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Admin</span>
              </div>
            </Link>
          </div>
          <nav className="flex-1 flex flex-col overflow-y-auto p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-[var(--admin-primary)] text-white dark:bg-white dark:text-[var(--admin-primary)]"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-[var(--admin-surface)] dark:hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                  {isActive && <ChevronRight size={14} className="ml-auto" />}
                </Link>
              )
            })}
            <div className="mt-auto p-3 border-t border-slate-100 dark:border-[var(--admin-border)]">
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
              >
                <LogOut size={18} />
                Log out
              </button>
            </div>
          </nav>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
    </>
  )
}
