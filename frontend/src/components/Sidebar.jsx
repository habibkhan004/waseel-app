import React, { useState, useEffect } from "react"
import {
  LayoutDashboard,
  Package,
  MessageSquare,
  Video,
  Settings,
  LogOut,
  ChevronRight,
  ChevronDown,
  Sparkles
} from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useMobileMenu } from "../context/MobileMenuContext"
import { useAuth } from "../context/AuthContext"

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  {
    icon: Package,
    label: "Catalog",
    href: "/dashboard/products",
    children: [
      { label: "Products", href: "/dashboard/products" },
      { label: "Manage products", href: "/dashboard/manage-products" },
      { label: "Store connections", href: "/dashboard/stores" },
      { label: "Services", href: "/dashboard/services" },
      { label: "Manage services", href: "/dashboard/manage-services" },
    ],
  },
  { icon: MessageSquare, label: "WhatsApp AI", href: "/dashboard/whatsapp" },
  { icon: Video, label: "Video Ads", href: "/dashboard/video-ads" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
]

export function AppSidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { isOpen, setIsOpen } = useMobileMenu()
  const { signOut } = useAuth()
  const [productsOpen, setProductsOpen] = useState(() =>
    pathname.startsWith("/dashboard/products") ||
    pathname.startsWith("/dashboard/manage-products") ||
    pathname.startsWith("/dashboard/stores") ||
    pathname.startsWith("/dashboard/services") ||
    pathname.startsWith("/dashboard/manage-services")
  )

  useEffect(() => {
    if (
      pathname.startsWith("/dashboard/products") ||
      pathname.startsWith("/dashboard/manage-products") ||
      pathname.startsWith("/dashboard/stores") ||
      pathname.startsWith("/dashboard/services") ||
      pathname.startsWith("/dashboard/manage-services")
    ) {
      setProductsOpen(true)
    }
  }, [pathname])

  const handleLogout = () => {
    signOut()
    navigate("/", { replace: true })
  }

  return (
    <>
      {/* Sidebar Container */}
      <div className={`w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed top-0 left-0 transition-transform duration-300 z-40 dark:bg-[var(--dark-blue)] dark:border-[var(--dark-blue-3)] ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-[var(--dark-blue)] rounded-xl flex items-center justify-center dark:bg-white">
              <Sparkles className="text-white dark:text-[var(--dark-blue)]" size={20} />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Waseel</span>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] leading-none mt-1 dark:text-slate-400">AI Assistant</p>
            </div>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const hasChildren = item.children && item.children.length > 0
              const isParentActive = hasChildren && item.children.some((c) => pathname === c.href)
              const isActive = !hasChildren && pathname === item.href

              if (hasChildren) {
                return (
                  <div key={item.href}>
                    <button
                      type="button"
                      onClick={() => setProductsOpen((o) => !o)}
                      className={`flex w-full items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                        isParentActive
                          ? "bg-[var(--dark-blue)]/10 text-[var(--dark-blue)] dark:bg-white/10 dark:text-white"
                          : "text-slate-600 hover:bg-slate-50 hover:text-[var(--dark-blue)] dark:text-slate-400 dark:hover:bg-[var(--dark-blue-2)] dark:hover:text-white"
                      }`}
                    >
                      <Icon size={18} className={isParentActive ? "text-[var(--dark-blue)] dark:text-white" : "text-slate-500 group-hover:text-[var(--dark-blue)] dark:text-slate-400 dark:group-hover:text-white"} />
                      <span className="font-bold text-sm">{item.label}</span>
                      <span className="ml-auto">
                        {productsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>
                    </button>
                    {productsOpen && (
                      <div className="mt-1 ml-4 pl-4 border-l-2 border-slate-200 dark:border-[var(--dark-blue-3)] space-y-0.5">
                        {item.children.map((sub) => {
                          const isSubActive = pathname === sub.href
                          return (
                            <Link
                              key={sub.href}
                              to={sub.href}
                              onClick={() => setIsOpen(false)}
                              className={`flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                                isSubActive
                                  ? "bg-[var(--dark-blue)] text-white dark:bg-white dark:text-[var(--dark-blue)]"
                                  : "text-slate-600 hover:bg-slate-50 hover:text-[var(--dark-blue)] dark:text-slate-400 dark:hover:bg-[var(--dark-blue-2)] dark:hover:text-white"
                              }`}
                            >
                              {sub.label}
                              {isSubActive && <ChevronRight size={12} className="ml-auto opacity-70" />}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                    isActive
                      ? "bg-[var(--dark-blue)] text-white dark:bg-white dark:text-[var(--dark-blue)]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-[var(--dark-blue)] dark:text-slate-400 dark:hover:bg-[var(--dark-blue-2)] dark:hover:text-white"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-white dark:text-[var(--dark-blue)]" : "text-slate-500 group-hover:text-[var(--dark-blue)] dark:text-slate-400 dark:group-hover:text-white"} />
                  <span className="font-bold text-sm">{item.label}</span>
                  {isActive && <ChevronRight size={14} className="ml-auto opacity-70" />}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-100 bg-slate-50/50 dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue-2)]">
          <div className="mb-4 p-4 rounded-xl bg-slate-100 border border-slate-200 dark:bg-[var(--dark-blue-3)] dark:border-[var(--dark-blue-3)]">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 dark:text-slate-400">System Status</p>
            <p className="text-xs font-bold text-slate-700 dark:text-white">v2.4.0 • Stable</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors font-bold text-sm border-none bg-transparent text-left cursor-pointer dark:text-slate-400 dark:hover:bg-[var(--dark-blue-3)] dark:hover:text-white"
          >
            <LogOut size={18} />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
