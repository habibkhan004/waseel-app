import React from "react"
import { Settings as SettingsIcon, Globe, Bell, Key, Palette } from "lucide-react"

const sections = [
  { icon: Globe, title: "General", desc: "App name, logo, support email, legal URLs" },
  { icon: Palette, title: "Features & limits", desc: "Feature flags, default limits per plan" },
  { icon: Key, title: "Integrations", desc: "API keys, webhooks, WhatsApp Business API" },
  { icon: Bell, title: "Notifications", desc: "Email templates, in-app announcements" },
]

export default function Settings() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-[var(--admin-primary)] dark:bg-white flex items-center justify-center">
          <SettingsIcon className="h-6 w-6 text-white dark:text-[var(--admin-primary)]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Settings</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Configure app and admin options</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {sections.map((s) => {
          const Icon = s.icon
          return (
            <div
              key={s.title}
              className="rounded-2xl border border-slate-200 dark:border-[var(--admin-border)] bg-white dark:bg-[var(--admin-surface)] p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-[var(--admin-border)] flex items-center justify-center flex-shrink-0">
                  <Icon size={20} className="text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{s.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{s.desc}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
