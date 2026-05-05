import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Users,
  MessageSquareText,
  Video,
  ArrowUpRight,
  TrendingUp,
  Circle,
  MoreHorizontal
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts"
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"

export default function DashboardPage() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const navigate = useNavigate()
  const isDark = theme === 'dark'
  const barFill = isDark ? '#ffffff' : '#0f172a'
  const [stats, setStats] = useState({
    messagesProcessed: 0,
    activeVideoAds: 0,
    salesImpact: 0,
    newLeads: 0,
    products: 0,
    services: 0,
    chartData: [],
    recentConversations: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function loadStats() {
      if (!user?.token) {
        if (active) setLoading(false)
        return
      }
      try {
        const res = await fetch(`${API_BASE}/api/users/me/stats`, {
          headers: { Authorization: `Bearer ${user.token}` },
        })
        if (!res.ok) throw new Error("Failed to load stats")
        const data = await res.json()
        if (active) {
          setStats((prev) => ({ ...prev, ...data }))
        }
      } catch (_) {
        if (active) setStats((prev) => ({ ...prev }))
      } finally {
        if (active) setLoading(false)
      }
    }
    loadStats()
    return () => { active = false }
  }, [user?.token])

  const cards = useMemo(() => ([
    { label: "Messages Today", value: stats.messagesProcessed, icon: MessageSquareText },
    { label: "Products", value: stats.products, icon: Video },
    { label: "Sales Impact", value: `SAR ${Number(stats.salesImpact || 0).toLocaleString()}`, icon: TrendingUp },
    { label: "New Leads (7d)", value: stats.newLeads, icon: Users },
  ]), [stats.messagesProcessed, stats.newLeads, stats.products, stats.salesImpact])

  const recentConversations = stats.recentConversations || []
  const chartData = stats.chartData?.length
    ? stats.chartData
    : [
      { name: 'Sun', messages: 0, replies: 0 },
      { name: 'Mon', messages: 0, replies: 0 },
      { name: 'Tue', messages: 0, replies: 0 },
      { name: 'Wed', messages: 0, replies: 0 },
      { name: 'Thu', messages: 0, replies: 0 },
      { name: 'Fri', messages: 0, replies: 0 },
      { name: 'Sat', messages: 0, replies: 0 },
    ]

  return (
    <div className="space-y-8 pb-20 md:pb-8 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 animate-fade-slide-up">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Welcome back, {user?.name || "Waseel Business"}
          </h1>
          <p className="text-sm md:text-base text-slate-500 font-medium max-w-md dark:text-slate-400">
            {loading ? "Loading your dashboard metrics..." : "Here is what's happening with your AI agents today."}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start bg-slate-100 border border-slate-200 px-4 py-2 rounded-full dark:bg-[var(--dark-blue-3)] dark:border-[var(--dark-blue-4)]">
          <Circle size={8} className="fill-emerald-500 text-emerald-500 animate-pulse dark:fill-emerald-400 dark:text-emerald-400" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-widest dark:text-slate-300">
            AI Agent Status: Online
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-slate-300 transition-all duration-300 group animate-fade-slide-up dark:bg-[var(--dark-blue)] dark:border-[var(--dark-blue-3)] dark:hover:border-[var(--dark-blue-4)]"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] dark:text-slate-400">
                  {stat.label}
                </span>
                <div className="p-2.5 bg-slate-100 rounded-xl text-[var(--dark-blue)] group-hover:bg-[var(--dark-blue)] group-hover:text-white transition-colors duration-300 dark:bg-[var(--dark-blue-3)] dark:text-white dark:group-hover:bg-[var(--dark-blue-4)]">
                  <Icon size={18} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-black text-slate-900 tracking-tight dark:text-white">{stat.value}</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-0.5 dark:text-emerald-400 dark:bg-emerald-400/10">
                    <ArrowUpRight size={12} /> live
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">auto updated</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Content Area */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Performance Chart Card */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col animate-fade-slide-up hover:border-slate-300 transition-all duration-300 dark:bg-[var(--dark-blue)] dark:border-[var(--dark-blue-3)] dark:hover:border-[var(--dark-blue-4)]">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between dark:border-[var(--dark-blue-3)]">
            <h2 className="text-lg font-black text-slate-900 tracking-tight dark:text-white">Performance Metrics</h2>
            <button className="text-slate-400 hover:text-slate-600 transition-colors dark:hover:text-white">
              <MoreHorizontal size={20} />
            </button>
          </div>
          <div className="p-6 flex-1 min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke={isDark ? '#94a3b8' : '#64748b'}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke={isDark ? '#94a3b8' : '#64748b'}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                />
                <Tooltip
                  cursor={{ fill: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(248, 250, 252, 0.8)' }}
                  contentStyle={{
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px 16px'
                  }}
                  itemStyle={{ color: isDark ? '#fff' : '#0f172a', fontWeight: 'bold' }}
                  formatter={(value, name) => [value, name === "replies" ? "Replies" : "Messages"]}
                  animationDuration={300}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 12, color: isDark ? '#94a3b8' : '#64748b' }}
                  formatter={(value) => (value === "replies" ? "Replies (this week)" : "Messages (this week)")}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar
                  dataKey="messages"
                  fill={barFill}
                  radius={[8, 8, 0, 0]}
                  barSize={36}
                  maxBarSize={48}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="replies"
                  fill={isDark ? '#64748b' : '#94a3b8'}
                  radius={[8, 8, 0, 0]}
                  barSize={24}
                  maxBarSize={32}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Conversations Feed Card */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col animate-fade-slide-up hover:border-slate-300 transition-all duration-300 dark:bg-[var(--dark-blue)] dark:border-[var(--dark-blue-3)] dark:hover:border-[var(--dark-blue-4)]">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between dark:border-[var(--dark-blue-3)]">
            <h2 className="text-lg font-black text-slate-900 tracking-tight dark:text-white">Recent Conversations</h2>
            <button className="text-xs font-bold text-[var(--dark-blue)] hover:underline dark:text-slate-300 dark:hover:text-white">View All</button>
          </div>
          <div className="flex-1 overflow-auto max-h-[450px] p-2 space-y-1">
            {(recentConversations.length ? recentConversations : [
              { name: "No conversations yet", msg: "Connect WhatsApp to start seeing live conversations.", type: "text", createdAt: new Date().toISOString() },
            ]).map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all duration-200 group border border-transparent hover:border-slate-100 cursor-pointer dark:hover:bg-[var(--dark-blue-2)] dark:hover:border-[var(--dark-blue-3)]">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-[var(--dark-blue)] flex items-center justify-center font-bold text-white text-base group-hover:bg-[var(--dark-blue-2)] transition-colors dark:bg-[var(--dark-blue-3)] dark:group-hover:bg-[var(--dark-blue-4)]">
                    {String(item.name || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm leading-none mb-1 dark:text-white">{item.name}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[150px] md:max-w-[200px] dark:text-slate-400">{item.msg}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap dark:text-slate-500">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <span className={`text-[9px] px-2.5 py-1 rounded-full border font-bold tracking-wider uppercase ${
                    item.type === 'voice'
                      ? "border-blue-200 text-[var(--dark-blue)] bg-blue-50 dark:border-[var(--dark-blue-4)] dark:text-slate-300 dark:bg-[var(--dark-blue-3)]"
                      : "border-slate-200 text-slate-600 bg-slate-50 dark:border-[var(--dark-blue-3)] dark:text-slate-400 dark:bg-[var(--dark-blue-2)]"
                  }`}>
                    {item.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-100 dark:border-[var(--dark-blue-3)]">
            <button
              onClick={() => navigate("/whatsapp-ai")}
              className="w-full py-3 rounded-xl bg-[var(--dark-blue)] text-white font-bold text-sm hover:opacity-90 transition-opacity dark:bg-[var(--dark-blue-3)] dark:hover:bg-[var(--dark-blue-4)]"
            >
              Launch WhatsApp AI
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
