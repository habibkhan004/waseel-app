import React from "react"
import { Link } from "react-router-dom"
import { Sparkles, Mail, MapPin, Phone } from "lucide-react"

const FOOTER_LINKS = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "WhatsApp AI", href: "#features" },
    { label: "Video Ads", href: "#features" },
  ],
  Company: [
    { label: "About us", href: "#about" },
    { label: "Contact", href: "#contact" },
    { label: "Careers", href: "#" },
    { label: "Blog", href: "#" },
  ],
  Legal: [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
    { label: "Cookies", href: "#" },
  ],
}

export default function WebsiteFooter() {
  const scrollTo = (e, href) => {
    if (href.startsWith("#") && href.length > 1) {
      e.preventDefault()
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <footer className="border-t border-slate-200 bg-slate-50 dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue-2)]">
      <div className="landing-container px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-slate-900 dark:text-white"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--dark-blue)] dark:bg-white">
                <Sparkles className="h-5 w-5 text-white dark:text-[var(--dark-blue)]" />
              </div>
              <span className="text-lg font-black tracking-tight">Waseel</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-slate-600 dark:text-slate-400">
              Saudi AI Sales — WhatsApp AI, video ads, and product catalog in one dashboard for your business.
            </p>
            <div className="mt-6 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <a href="mailto:hello@waseel.ai" className="flex items-center gap-2 hover:text-[var(--dark-blue)] dark:hover:text-white">
                <Mail size={16} /> hello@waseel.ai
              </a>
              <a href="tel:+966500000000" className="flex items-center gap-2 hover:text-[var(--dark-blue)] dark:hover:text-white">
                <Phone size={16} /> +966 50 000 0000
              </a>
              <p className="flex items-center gap-2">
                <MapPin size={16} /> Riyadh, Saudi Arabia
              </p>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Product
            </h3>
            <ul className="mt-4 space-y-2">
              {FOOTER_LINKS.Product.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    onClick={(e) => scrollTo(e, item.href)}
                    className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Company
            </h3>
            <ul className="mt-4 space-y-2">
              {FOOTER_LINKS.Company.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    onClick={(e) => scrollTo(e, item.href)}
                    className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Legal
            </h3>
            <ul className="mt-4 space-y-2">
              {FOOTER_LINKS.Legal.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-[var(--dark-blue-3)]">
          <p className="text-center text-xs text-slate-500 dark:text-slate-500">
            © {new Date().getFullYear()} Waseel. All rights reserved. Saudi AI Sales.
          </p>
        </div>
      </div>
    </footer>
  )
}
