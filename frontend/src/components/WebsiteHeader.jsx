import React, { useState } from "react"
import { Link } from "react-router-dom"
import { Sparkles, Sun, Moon, Menu, X } from "lucide-react"
import { useTheme } from "../context/ThemeContext"
import { useAuthModal } from "../context/AuthModalContext"

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Videos", href: "#video-guidance" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
]

export default function WebsiteHeader() {
  const { theme, toggleTheme } = useTheme()
  const { openLogin, openSignUp } = useAuthModal()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const scrollTo = (e, href) => {
    if (href.startsWith("#")) {
      e.preventDefault()
      const el = document.querySelector(href)
      el?.scrollIntoView({ behavior: "smooth" })
    }
    setMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue)]/95 dark:supports-[backdrop-filter]:dark:bg-[var(--dark-blue)]/90">
      <div className="landing-container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-slate-900 dark:text-white"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--dark-blue)] dark:bg-white">
            <Sparkles className="h-5 w-5 text-white dark:text-[var(--dark-blue)]" />
          </div>
          <span className="text-lg font-black tracking-tight">Waseel</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => scrollTo(e, item.href)}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-300 dark:hover:text-white dark:hover:bg-[var(--dark-blue-2)]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right: theme + Login + Get started */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-[var(--dark-blue-2)] transition-colors"
            aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            type="button"
            onClick={() => { openLogin(); setMobileMenuOpen(false); }}
            className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-bold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { document.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" }); setMobileMenuOpen(false); }}
            className="hidden sm:inline-flex items-center justify-center rounded-xl bg-[var(--dark-blue)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity dark:bg-white dark:text-[var(--dark-blue)]"
          >
            Get started
          </button>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue-2)] dark:text-slate-200"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-[var(--dark-blue-3)] bg-white dark:bg-[var(--dark-blue)] px-4 py-4">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => scrollTo(e, item.href)}
                className="px-4 py-3 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[var(--dark-blue-2)]"
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => { openLogin(); setMobileMenuOpen(false); }}
              className="w-full mt-2 px-4 py-3 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => { document.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" }); setMobileMenuOpen(false); }}
              className="w-full mt-2 px-4 py-3 rounded-xl bg-[var(--dark-blue)] text-center text-sm font-bold text-white dark:bg-white dark:text-[var(--dark-blue)]"
            >
              Get started
            </button>
          </nav>
        </div>
      )}
    </header>
  )
}
