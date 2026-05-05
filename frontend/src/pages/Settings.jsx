import React, { useState } from "react"
import {
  User,
  Building2,
  Mail,
  Phone,
  Sun,
  Moon,
  Bell,
  MessageSquare,
  Video,
  Key,
  Save,
  ChevronRight,
} from "lucide-react"
import { useTheme } from "../context/ThemeContext"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [businessName, setBusinessName] = useState("Waseel Business")
  const [email, setEmail] = useState("admin@waseel.example")
  const [phone, setPhone] = useState("+966 5X XXX XXXX")
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [pushNotifs, setPushNotifs] = useState(true)
  const [saved, setSaved] = useState(false)

  const handleSave = (e) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-8 pb-20 md:pb-8 min-h-screen">
      <div className="animate-fade-slide-up">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
          Settings
        </h1>
        <p className="text-sm md:text-base text-slate-500 mt-1 dark:text-slate-400">
          Manage your account, business profile, and preferences.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile / Business */}
        <div className="bg-white dark:bg-[var(--dark-blue)] border border-slate-200 dark:border-[var(--dark-blue-3)] rounded-2xl overflow-hidden animate-fade-slide-up">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-[var(--dark-blue-3)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[var(--dark-blue-3)] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[var(--dark-blue)] dark:text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">Business profile</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Used in WhatsApp AI and video ads</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Business name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[var(--dark-blue-3)] bg-white dark:bg-[var(--dark-blue-2)] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20 focus:border-[var(--dark-blue)]"
                placeholder="Your business name"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[var(--dark-blue-3)] bg-white dark:bg-[var(--dark-blue-2)] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20 focus:border-[var(--dark-blue)]"
                placeholder="contact@business.com"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[var(--dark-blue-3)] bg-white dark:bg-[var(--dark-blue-2)] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20 focus:border-[var(--dark-blue)]"
                placeholder="+966 ..."
              />
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-white dark:bg-[var(--dark-blue)] border border-slate-200 dark:border-[var(--dark-blue-3)] rounded-2xl overflow-hidden animate-fade-slide-up">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-[var(--dark-blue-3)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[var(--dark-blue-3)] flex items-center justify-center">
              {theme === "dark" ? <Moon className="w-5 h-5 text-[var(--dark-blue)] dark:text-white" /> : <Sun className="w-5 h-5 text-[var(--dark-blue)] dark:text-white" />}
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">Appearance</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Theme for the dashboard</p>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Theme</span>
              <div className="flex rounded-xl border border-slate-200 dark:border-[var(--dark-blue-3)] p-0.5 bg-slate-50 dark:bg-[var(--dark-blue-2)]">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${theme === "light" ? "bg-white dark:bg-[var(--dark-blue-3)] text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
                >
                  <Sun size={16} /> Light
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${theme === "dark" ? "bg-white dark:bg-[var(--dark-blue-3)] text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
                >
                  <Moon size={16} /> Dark
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-[var(--dark-blue)] border border-slate-200 dark:border-[var(--dark-blue-3)] rounded-2xl overflow-hidden animate-fade-slide-up">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-[var(--dark-blue-3)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[var(--dark-blue-3)] flex items-center justify-center">
              <Bell className="w-5 h-5 text-[var(--dark-blue)] dark:text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">Notifications</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">When to get notified</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 dark:text-white text-sm">Email notifications</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">New conversations, low stock alerts</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={emailNotifs}
                onClick={() => setEmailNotifs((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors ${emailNotifs ? "bg-[var(--dark-blue)] dark:bg-white" : "bg-slate-200 dark:bg-[var(--dark-blue-3)]"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white dark:bg-[var(--dark-blue)] shadow transition-transform ${emailNotifs ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 dark:text-white text-sm">Push notifications</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Browser and app alerts</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={pushNotifs}
                onClick={() => setPushNotifs((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors ${pushNotifs ? "bg-[var(--dark-blue)] dark:bg-white" : "bg-slate-200 dark:bg-[var(--dark-blue-3)]"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white dark:bg-[var(--dark-blue)] shadow transition-transform ${pushNotifs ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* WhatsApp AI */}
        <div className="bg-white dark:bg-[var(--dark-blue)] border border-slate-200 dark:border-[var(--dark-blue-3)] rounded-2xl overflow-hidden animate-fade-slide-up">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-[var(--dark-blue-3)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[var(--dark-blue-3)] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-[var(--dark-blue)] dark:text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">WhatsApp AI</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tone, dialect, quick replies</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
          <div className="p-5">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Configure reply tone and Saudi dialect in the WhatsApp AI page when your number is connected.
            </p>
          </div>
        </div>

        {/* Video Ads */}
        <div className="bg-white dark:bg-[var(--dark-blue)] border border-slate-200 dark:border-[var(--dark-blue-3)] rounded-2xl overflow-hidden animate-fade-slide-up">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-[var(--dark-blue-3)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[var(--dark-blue-3)] flex items-center justify-center">
                <Video className="w-5 h-5 text-[var(--dark-blue)] dark:text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">Video ads</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Default duration, template</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
          <div className="p-5">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Set default video length and style in the Video Ads page when you create your first ad.
            </p>
          </div>
        </div>

        {/* API / Integrations */}
        <div className="bg-white dark:bg-[var(--dark-blue)] border border-slate-200 dark:border-[var(--dark-blue-3)] rounded-2xl overflow-hidden animate-fade-slide-up">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-[var(--dark-blue-3)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[var(--dark-blue-3)] flex items-center justify-center">
              <Key className="w-5 h-5 text-[var(--dark-blue)] dark:text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">API & integrations</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Keys and webhooks (when backend is ready)</p>
            </div>
          </div>
          <div className="p-5">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              API keys and webhook URLs will appear here once you connect your backend.
            </p>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end animate-fade-slide-up">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--dark-blue)] text-white px-6 py-2.5 font-bold text-sm hover:opacity-90 dark:bg-white dark:text-[var(--dark-blue)] disabled:opacity-60"
          >
            {saved ? (
              "Saved"
            ) : (
              <>
                <Save size={18} /> Save changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
