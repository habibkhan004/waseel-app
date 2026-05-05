import React, { useState, useEffect, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Bell,
  Search,
  Circle,
  User,
  Settings,
  Sun,
  Moon,
  X,
  LogOut,
  ChevronDown,
} from "lucide-react"
import { useTheme } from "../context/ThemeContext"
import { useMobileMenu } from "../context/MobileMenuContext"
import { useAuth } from "../context/AuthContext"
import { apiGet, apiPatch } from "../lib/api"

export default function Navbar() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { isOpen, toggle } = useMobileMenu()
  const { user, signOut } = useAuth()
  const [notifOpen, setNotifOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifLoading, setNotifLoading] = useState(false)
  const notifRef = useRef(null)
  const accountRef = useRef(null)

  useEffect(() => {
    if (!user) return
    setNotifLoading(true)
    apiGet("/api/notifications")
      .then(({ ok, data }) => {
        if (ok && data.notifications) {
          setNotifications(data.notifications)
          setUnreadCount(data.notifications.filter((n) => !n.read).length)
        }
      })
      .finally(() => setNotifLoading(false))
  }, [user])

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

  const markRead = async (id) => {
    const { ok } = await apiPatch(`/api/notifications/${id}/read`)
    if (ok) {
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    }
  }

  const handleLogout = () => {
    signOut()
    setAccountOpen(false)
    navigate("/", { replace: true })
  }

  const displayName = user?.name || user?.email || "Account"
  const planLabel = (user?.plan || "beta").charAt(0).toUpperCase() + (user?.plan || "beta").slice(1)

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 md:px-8 dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue)]">
      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
        <button
          type="button"
          onClick={toggle}
          className="md:hidden h-11 w-11 flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900 active:scale-[0.98] transition-all duration-200 flex-shrink-0 shadow-sm dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue-2)] dark:text-slate-200 dark:hover:bg-[var(--dark-blue-3)] dark:hover:text-white dark:hover:border-[var(--dark-blue-4)] focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/30 focus:ring-offset-2 dark:focus:ring-offset-[var(--dark-blue)] dark:focus:ring-white/20"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <X size={22} className="transition-transform duration-200" strokeWidth={2.25} />
          ) : (
            <span className="flex flex-col gap-1.5 items-start" aria-hidden>
              <span className="h-0.5 w-5 rounded-full bg-current min-w-[20px]" />
              <span className="h-0.5 w-4 rounded-full bg-current min-w-[16px]" />
              <span className="h-0.5 w-3 rounded-full bg-current min-w-[12px]" />
            </span>
          )}
        </button>
        <div className="relative hidden max-w-md w-full md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search analytics..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/10 focus:border-[var(--dark-blue)] transition-all dark:bg-[var(--dark-blue-2)] dark:border-[var(--dark-blue-3)] dark:text-white dark:placeholder:text-slate-400 dark:focus:ring-white/20 dark:focus:border-[var(--dark-blue-4)]"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        <button
          type="button"
          onClick={toggleTheme}
          className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all bg-transparent border-none cursor-pointer dark:hover:bg-[var(--dark-blue-2)] dark:text-slate-400 dark:hover:text-white"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 lg:flex dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue-2)]">
          <Circle size={6} className="fill-emerald-500 text-emerald-500 animate-pulse dark:fill-emerald-400 dark:text-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
            AI Agent: Active
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Link
            to="/dashboard/settings"
            className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 hover:text-[var(--dark-blue)] transition-all bg-transparent border-none cursor-pointer dark:hover:bg-[var(--dark-blue-2)] dark:text-slate-400 dark:hover:text-white"
            aria-label="Settings"
          >
            <Settings size={20} />
          </Link>

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 hover:text-[var(--dark-blue)] transition-all bg-transparent border-none cursor-pointer relative dark:hover:bg-[var(--dark-blue-2)] dark:text-slate-400 dark:hover:text-white"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-2.5 right-2.5 flex h-2 w-2 rounded-full bg-[var(--dark-blue)] border-2 border-white dark:bg-white dark:border-[var(--dark-blue)]" />
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 max-h-[360px] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue-2)] py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-[var(--dark-blue-3)]">
                  <h3 className="font-bold text-slate-900 dark:text-white">Notifications</h3>
                </div>
                {notifLoading ? (
                  <p className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">Loading…</p>
                ) : notifications.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">No notifications yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-[var(--dark-blue-3)]">
                    {notifications.map((n) => (
                      <li key={n._id}>
                        <button
                          type="button"
                          onClick={() => markRead(n._id)}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-[var(--dark-blue-3)] transition-colors ${!n.read ? "bg-slate-50/50 dark:bg-[var(--dark-blue-3)]/50" : ""}`}
                        >
                          <p className="font-semibold text-sm text-slate-900 dark:text-white">{n.title}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                            {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="h-8 w-px bg-slate-200 mx-1 dark:bg-[var(--dark-blue-3)]" />

        <div className="relative" ref={accountRef}>
          <button
            type="button"
            onClick={() => setAccountOpen((v) => !v)}
            className="flex items-center gap-3 rounded-xl hover:bg-slate-100 dark:hover:bg-[var(--dark-blue-2)] p-1.5 pr-2 transition-colors"
          >
            <div className="hidden text-right lg:block">
              <p className="text-xs font-black text-slate-900 leading-none dark:text-white">{displayName}</p>
              <p className="mt-1 text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">{planLabel} Tier</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[var(--dark-blue)] flex items-center justify-center text-white dark:bg-white dark:text-[var(--dark-blue)]">
              <User size={20} />
            </div>
            <ChevronDown size={16} className="text-slate-500 dark:text-slate-400" />
          </button>
          {accountOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue-2)] py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-[var(--dark-blue-3)]">
                <p className="font-bold text-slate-900 dark:text-white truncate">{displayName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{planLabel}</p>
              </div>
              <Link
                to="/dashboard/settings"
                onClick={() => setAccountOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[var(--dark-blue-3)]"
              >
                <Settings size={16} /> Account settings
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
