import React, { useState } from "react"
import {
  Video,
  Plus,
  Search,
  Download,
  Play,
  ImagePlus,
  Clock,
  CheckCircle2,
  Loader2,
  Instagram,
  MoreHorizontal,
} from "lucide-react"

const DUMMY_VIDEOS = [
  { id: 1, title: "Oud Royal Perfume — Summer", product: "Oud Royal Perfume 50ml", duration: "0:18", status: "ready", createdAt: "2h ago", thumbnail: "https://picsum.photos/seed/v1/400/225" },
  { id: 2, title: "Arabic Musk Oil Promo", product: "Arabic Musk Oil 30ml", duration: "0:22", status: "rendering", createdAt: "45m ago", thumbnail: "https://picsum.photos/seed/v2/400/225" },
  { id: 3, title: "Saffron Gift Set — Ramadan", product: "Saffron Gift Set", duration: "0:25", status: "ready", createdAt: "Yesterday", thumbnail: "https://picsum.photos/seed/v3/400/225" },
  { id: 4, title: "Rose Water Skincare", product: "Rose Water 200ml", duration: "0:15", status: "draft", createdAt: "2 days ago", thumbnail: "https://picsum.photos/seed/v4/400/225" },
  { id: 5, title: "Bakhoor Premium", product: "Bakhoor Premium Box", duration: "0:20", status: "ready", createdAt: "3 days ago", thumbnail: "https://picsum.photos/seed/v5/400/225" },
]

const DUMMY_STATS = [
  { label: "Videos created", value: "24", icon: Video },
  { label: "This month", value: "8", icon: Play },
  { label: "Ready to post", value: "5", icon: CheckCircle2 },
]

const statusConfig = {
  ready: { label: "Ready", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-400/30" },
  rendering: { label: "Rendering", icon: Loader2, className: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400 border-amber-200 dark:border-amber-400/30" },
  draft: { label: "Draft", icon: Clock, className: "bg-slate-100 text-slate-600 dark:bg-slate-600/20 dark:text-slate-400 border-slate-200 dark:border-slate-500/30" },
}

function VideoCard({ video }) {
  const config = statusConfig[video.status] || statusConfig.draft
  const Icon = config.icon
  const [imgError, setImgError] = useState(false)

  return (
    <div className="bg-white dark:bg-[var(--dark-blue)] border border-slate-200 dark:border-[var(--dark-blue-3)] rounded-2xl overflow-hidden hover:border-slate-300 dark:hover:border-[var(--dark-blue-4)] transition-all duration-300 group">
      <div className="aspect-video bg-slate-100 dark:bg-[var(--dark-blue-3)] relative">
        {!imgError && video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="w-12 h-12 text-slate-400 dark:text-slate-500" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button className="w-14 h-14 rounded-full bg-white/90 dark:bg-[var(--dark-blue)] flex items-center justify-center text-[var(--dark-blue)] dark:text-white shadow-lg hover:scale-110 transition-transform">
            <Play size={28} className="ml-0.5" fill="currentColor" />
          </button>
        </div>
        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold">
          {video.duration}
        </span>
        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 ${config.className}`}>
          <Icon size={12} className={video.status === "rendering" ? "animate-spin" : ""} />
          {config.label}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{video.title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{video.product}</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{video.createdAt}</p>
        <div className="mt-3 flex items-center gap-2">
          {video.status === "ready" && (
            <>
              <button className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[var(--dark-blue)] dark:bg-white text-white dark:text-[var(--dark-blue)] text-xs font-bold hover:opacity-90">
                <Download size={14} /> Download
              </button>
              <button className="p-2 rounded-xl border border-slate-200 dark:border-[var(--dark-blue-3)] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[var(--dark-blue-3)] transition-colors" title="Post to Instagram">
                <Instagram size={18} />
              </button>
            </>
          )}
          {video.status === "draft" && (
            <button className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-[var(--dark-blue-3)] text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-[var(--dark-blue-3)] transition-colors">
              Continue editing
            </button>
          )}
          {video.status === "rendering" && (
            <span className="flex-1 py-2 text-center rounded-xl bg-slate-50 dark:bg-[var(--dark-blue-3)] text-xs font-medium text-slate-500 dark:text-slate-400">
              Generating...
            </span>
          )}
          <button className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-[var(--dark-blue-3)] dark:hover:text-white transition-colors">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function VideoAdsPage() {
  const [search, setSearch] = useState("")

  const filteredVideos = DUMMY_VIDEOS.filter(
    (v) =>
      v.title.toLowerCase().includes(search.toLowerCase()) ||
      v.product.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8 pb-20 md:pb-8 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-slide-up">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Video Ads
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-1 dark:text-slate-400">
            AI-generated product ads. Upload image → script → voiceover → 15–30s MP4 for Instagram.
          </p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--dark-blue)] text-white px-5 py-2.5 font-bold text-sm hover:opacity-90 dark:bg-white dark:text-[var(--dark-blue)] self-start sm:self-auto shadow-lg shadow-[var(--dark-blue)]/20 dark:shadow-slate-900/30">
          <Plus size={18} />
          Create video ad
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-3 animate-fade-slide-up">
        {DUMMY_STATS.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="bg-white dark:bg-[var(--dark-blue)] border border-slate-200 dark:border-[var(--dark-blue-3)] rounded-2xl p-5 hover:border-slate-300 dark:hover:border-[var(--dark-blue-4)] transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider dark:text-slate-400">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stat.value}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-[var(--dark-blue-3)] flex items-center justify-center">
                  <Icon className="w-6 h-6 text-[var(--dark-blue)] dark:text-white" size={24} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="animate-fade-slide-up">
        <div className="relative max-w-md mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search video ads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[var(--dark-blue)] border border-slate-200 dark:border-[var(--dark-blue-3)] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--dark-blue)]/20 focus:border-[var(--dark-blue)] dark:focus:border-[var(--dark-blue-4)]"
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      </div>

      {filteredVideos.length === 0 && (
        <p className="text-center text-slate-500 dark:text-slate-400 py-12">
          No video ads match your search.
        </p>
      )}

      <div className="bg-white dark:bg-[var(--dark-blue)] border border-slate-200 dark:border-[var(--dark-blue-3)] rounded-2xl p-6 animate-fade-slide-up">
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ImagePlus size={18} />
          How it works
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { step: 1, title: "Upload product image", desc: "From your catalog or new upload" },
            { step: 2, title: "AI writes script", desc: "Saudi dialect, sales tone, 15–30 sec" },
            { step: 3, title: "Voiceover + render", desc: "Arabic TTS, template, captions" },
            { step: 4, title: "Download or post", desc: "MP4 ready for Instagram" },
          ].map((item) => (
            <div key={item.step} className="flex gap-3">
              <span className="w-8 h-8 rounded-full bg-[var(--dark-blue)] dark:bg-[var(--dark-blue-4)] text-white flex items-center justify-center text-sm font-black flex-shrink-0">
                {item.step}
              </span>
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{item.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
