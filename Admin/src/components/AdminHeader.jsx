import React, { useState, useRef, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Search, Bell, Sun, Moon, User, Settings, LogOut } from "lucide-react"
import { useAdminAuth } from "../context/AdminAuthContext"

export function AdminHeader({ title, subtitle }) {
  const navigate = useNavigate()
  const { logout } = useAdminAuth()
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false
    return document.documentElement.classList.contains("dark")
  })
  const [notifOpen, setNotifOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const notifRef = useRef(null)
  const accountRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        notifRef.current && !notifRef.current.contains(e.target) &&
        accountRef.current && !accountRef.current.contains(e.target)
      ) {
        setNotifOpen(false)
        setAccountOpen(false)
      }
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [])

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark", !dark)
    setDark(!dark)
  }

  const handleLogout = () => {
    logout()
    setAccountOpen(false)
    navigate("/login", { replace: true })
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 md:h-16 items-center justify-between gap-4 border-b border-slate-200 dark:border-[var(--admin-border)] bg-white/95 dark:bg-[var(--admin-primary)] backdrop-blur px-4 md:px-6 lg:px-8">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white truncate">
          {title}
        </h1>
        {subtitle && (
          <span className="hidden sm:inline text-sm text-slate-500 dark:text-slate-400 truncate">
            {subtitle}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="hidden sm:block relative w-48 lg:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-[var(--admin-border)] bg-slate-50 dark:bg-[var(--admin-surface)] text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/20"
          />
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[var(--admin-surface)]"
          aria-label="Toggle theme"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[var(--admin-surface)] relative"
            aria-label="Notifications"
          >
            <Bell size={18} />
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 max-h-[320px] overflow-auto rounded-xl border border-slate-200 dark:border-[var(--admin-border)] bg-white dark:bg-[var(--admin-surface)] shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-[var(--admin-border)]">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Notifications</h3>
              </div>
              <p className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">No notifications yet.</p>
            </div>
          )}
        </div>

        <div className="relative" ref={accountRef}>
          <button
            type="button"
            onClick={() => setAccountOpen((v) => !v)}
            className="h-9 w-9 rounded-lg bg-[var(--admin-primary)] dark:bg-white flex items-center justify-center hover:opacity-90 transition-opacity"
            title="Account"
            aria-label="Account"
          >
            <User className="h-4 w-4 text-white dark:text-[var(--admin-primary)]" />
          </button>
          {accountOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 dark:border-[var(--admin-border)] bg-white dark:bg-[var(--admin-surface)] shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-[var(--admin-border)]">
                <p className="font-bold text-slate-900 dark:text-white truncate text-sm">Admin</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">admin@waseel.com</p>
              </div>
              <Link
                to="/settings"
                onClick={() => setAccountOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[var(--admin-surface)]"
              >
                <Settings size={16} /> Settings
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut size={16} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
