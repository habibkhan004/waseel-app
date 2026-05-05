import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Sparkles,
  Check,
  MessageSquare,
  Video,
  Package,
  BarChart3,
  ArrowRight,
  Shield,
  Zap,
  Users,
  Play,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { useAuthModal } from "../context/AuthModalContext"
import { useInView } from "../hooks/useInView"
import WebsiteHeader from "../components/WebsiteHeader"
import WebsiteFooter from "../components/WebsiteFooter"

/* Hero & guidance images – replace with your own in production */
const HERO_IMAGES = {
  dashboard: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=720&q=80",
  mobile: "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400&q=80",
}

const GUIDANCE_VIDEOS = [
  {
    id: "get-started",
    title: "Get started in 2 minutes",
    description: "Sign up, pick your plan, and land in your dashboard.",
    thumbnail: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&q=80",
    duration: "2:00",
  },
  {
    id: "whatsapp",
    title: "Connect WhatsApp",
    description: "Link your number and let AI handle customer conversations.",
    thumbnail: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&q=80",
    duration: "3:15",
  },
  {
    id: "video-ads",
    title: "Create your first video ad",
    description: "Generate a product video and publish to social in one click.",
    thumbnail: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&q=80",
    duration: "4:30",
  },
]

const PLANS = [
  {
    id: "beta",
    name: "Beta",
    price: "Free",
    currency: "",
    period: "",
    description: "Free during beta. Full access to try the platform.",
    features: [
      "Up to 200 WhatsApp conversations/month",
      "3 AI-generated video ads",
      "Product catalog (up to 25 items)",
      "Community support",
    ],
    highlighted: true,
    free: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: "249",
    currency: "SAR",
    period: "/month",
    description: "For growing teams that need more power.",
    features: [
      "Unlimited WhatsApp conversations",
      "20 AI-generated video ads",
      "Product catalog (up to 200 items)",
      "Priority support",
      "Custom AI tone & language",
    ],
    highlighted: false,
    free: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    currency: "",
    period: "",
    description: "For large organizations with custom needs.",
    features: [
      "Everything in Premium",
      "Dedicated account manager",
      "API access",
      "SLA guarantee",
      "On-premise option",
    ],
    highlighted: false,
    free: false,
  },
]

const FEATURES = [
  {
    icon: MessageSquare,
    title: "WhatsApp AI",
    description: "Automate customer conversations with AI that speaks your brand. Handle inquiries, orders, and support 24/7.",
  },
  {
    icon: Video,
    title: "Video Ads",
    description: "Generate professional product video ads in minutes. Optimized for Instagram, TikTok, and social selling.",
  },
  {
    icon: Package,
    title: "Product Catalog",
    description: "Manage your catalog in one place. Add images, prices in SAR or USD, and sync with WhatsApp and ads.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Track conversations, ad performance, and sales from a single dashboard. Make decisions with real data.",
  },
]

const HOW_IT_WORKS = [
  { step: 1, title: "Choose your plan", text: "Start free with Beta, or go Premium and Enterprise for more." },
  { step: 2, title: "Create your account", text: "Sign up with email or Google. No credit card required for Beta." },
  { step: 3, title: "Start selling", text: "Connect WhatsApp, add products, create video ads, and let AI handle conversations." },
]

const TESTIMONIALS = [
  {
    quote: "Waseel cut our response time by 80%. Customers get answers at any hour.",
    author: "Ahmed M.",
    role: "E-commerce owner, Riyadh",
  },
  {
    quote: "The video ad tool is a game-changer. We launch new campaigns in minutes.",
    author: "Sara K.",
    role: "Marketing lead, Jeddah",
  },
  {
    quote: "One dashboard for everything. Finally we stopped switching between 5 tools.",
    author: "Omar H.",
    role: "Retail manager, Dammam",
  },
]

function FeaturesContent() {
  const [ref, inView] = useInView()
  return (
    <div ref={ref} className="mx-auto max-w-6xl">
      <div className={`text-center mb-14 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Everything you need to sell more
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-slate-400">
          One platform. WhatsApp, video ads, catalog, and analytics — built for Gulf and Saudi businesses.
        </p>
      </div>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((item, i) => {
          const Icon = item.icon
          return (
            <div
              key={item.title}
              className={`rounded-2xl border border-slate-200 bg-slate-50/50 p-6 transition-all duration-500 dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue)]/50 hover:shadow-lg hover:border-slate-300 dark:hover:border-[var(--dark-blue-4)] ${
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: inView ? `${120 * i}ms` : "0ms" }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--dark-blue)] dark:bg-white">
                <Icon className="h-6 w-6 text-white dark:text-[var(--dark-blue)]" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {item.description}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HowItWorksContent() {
  const [ref, inView] = useInView()
  return (
    <div ref={ref} className="mx-auto max-w-4xl">
      <div className={`text-center mb-14 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          How it works
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-slate-600 dark:text-slate-400">
          Three steps to your AI-powered sales dashboard.
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-3">
        {HOW_IT_WORKS.map((item, i) => (
          <div
            key={item.step}
            className={`text-center transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: inView ? `${150 * i}ms` : "0ms" }}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--dark-blue)] text-2xl font-black text-white dark:bg-white dark:text-[var(--dark-blue)]">
              {item.step}
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
              {item.title}
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function VideoGuidanceContent() {
  const [ref, inView] = useInView()
  return (
    <div ref={ref} className="mx-auto max-w-6xl">
      <div className={`text-center mb-14 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Watch how it works
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-slate-400">
          Short guidance videos to get you from sign-up to your first sale.
        </p>
      </div>

      {/* Main hero video placeholder */}
      <div className={`mb-16 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`} style={{ transitionDelay: "200ms" }}>
        <div className="relative aspect-video max-w-4xl mx-auto rounded-2xl overflow-hidden bg-slate-900 dark:bg-[var(--dark-blue)] ring-1 ring-slate-200 dark:ring-[var(--dark-blue-3)] shadow-2xl">
          <img
            src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&q=80"
            alt="Product overview"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-900/50 dark:bg-[var(--dark-blue)]/60 flex items-center justify-center">
            <button
              type="button"
              className="group flex h-20 w-20 items-center justify-center rounded-full bg-white/95 text-[var(--dark-blue)] shadow-xl hover:bg-white hover:scale-110 transition-all duration-300"
              aria-label="Play overview video"
            >
              <Play className="h-10 w-10 ml-1 text-[var(--dark-blue)]" fill="currentColor" />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white font-bold text-lg">Full product walkthrough — 5 min</p>
            <p className="text-white/80 text-sm mt-1">See the dashboard, WhatsApp AI, and video ads in action</p>
          </div>
        </div>
      </div>

      {/* Guidance video cards */}
      <div className="grid gap-8 sm:grid-cols-3">
        {GUIDANCE_VIDEOS.map((video, i) => (
          <div
            key={video.id}
            className={`group transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: inView ? `${300 + 100 * i}ms` : "0ms" }}
          >
            <div className="rounded-2xl border border-slate-200 dark:border-[var(--dark-blue-3)] bg-white dark:bg-[var(--dark-blue)] overflow-hidden shadow-lg hover:shadow-xl hover:border-slate-300 dark:hover:border-[var(--dark-blue-4)] transition-all">
              <div className="relative aspect-video">
                <img
                  src={video.thumbnail}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-900/40 group-hover:bg-slate-900/30 flex items-center justify-center transition-colors">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-[var(--dark-blue)] shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="h-6 w-6 ml-0.5" fill="currentColor" />
                  </span>
                </div>
                <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-xs font-bold text-white">
                  {video.duration}
                </span>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-slate-900 dark:text-white">{video.title}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{video.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { theme } = useTheme()
  const { openSignUp } = useAuthModal()
  const [pricingRef, pricingInView] = useInView()
  const [testimonialsRef, testimonialsInView] = useInView()
  const [aboutRef, aboutInView] = useInView()
  const [contactRef, contactInView] = useInView()

  const isDark = theme === "dark"
  const reveal = (inView) => (inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6")
  const revealDelay = (inView, delay) => ({ transitionDelay: inView ? `${delay}ms` : "0ms" })

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true })
    }
  }, [isAuthenticated, navigate])

  const scrollToPricing = () => {
    document.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div
      className={`min-h-screen ${
        isDark ? "bg-[var(--dark-blue)] text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      <WebsiteHeader />

      <main>
        {/* Hero with images */}
        <section className="relative overflow-hidden px-4 pt-12 pb-20 sm:px-6 sm:pt-16 sm:pb-28 lg:px-8 lg:pt-20 lg:pb-32">
          <div className="landing-container">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="text-center lg:text-left">
                <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-[var(--dark-blue-3)] bg-white dark:bg-[var(--dark-blue-2)] px-4 py-2 shadow-sm mb-8">
                  <Sparkles className="h-4 w-4 text-[var(--dark-blue)] dark:text-white" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Saudi AI Sales
                  </span>
                </div>
                <h1 className="animate-fade-in-up delay-100 text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
                  Sell smarter with{" "}
                  <span className="text-[var(--dark-blue)] dark:text-white">Waseel AI</span>
                </h1>
                <p className="animate-fade-in-up delay-200 mt-6 max-w-xl text-lg text-slate-600 dark:text-slate-300 sm:text-xl lg:max-w-lg">
                  WhatsApp AI, video ads, and product catalog — one dashboard for your business. Start in minutes.
                </p>
                <div className="animate-fade-in-up delay-300 mt-10 flex flex-col items-center gap-4 sm:flex-row lg:items-start">
                  <button
                    type="button"
                    onClick={scrollToPricing}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--dark-blue)] px-8 py-4 text-base font-bold text-white shadow-lg hover:opacity-90 hover:shadow-xl transition-all sm:w-auto dark:bg-white dark:text-[var(--dark-blue)]"
                  >
                    Get started
                    <ArrowRight size={18} />
                  </button>
                  <a
                    href="#video-guidance"
                    onClick={(e) => {
                      e.preventDefault()
                      document.querySelector("#video-guidance")?.scrollIntoView({ behavior: "smooth" })
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-8 py-4 text-base font-bold text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-colors dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue-2)] dark:text-white dark:hover:bg-[var(--dark-blue-3)] sm:w-auto"
                  >
                    Watch how it works
                  </a>
                </div>
              </div>

              {/* Hero images */}
              <div className="relative hidden lg:block">
                <div className="animate-fade-in-right delay-300 relative flex justify-center">
                  <div className="relative w-full max-w-md">
                    <img
                      src={HERO_IMAGES.dashboard}
                      alt="Dashboard overview"
                      className="w-full rounded-2xl shadow-2xl ring-1 ring-slate-200/50 dark:ring-[var(--dark-blue-3)]"
                    />
                    <div className="animate-float absolute -right-4 -bottom-4 w-[55%] rounded-xl shadow-xl ring-1 ring-slate-200/50 dark:ring-[var(--dark-blue-3)] overflow-hidden">
                      <img
                        src={HERO_IMAGES.mobile}
                        alt="Mobile app"
                        className="w-full aspect-[9/16] object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="border-t border-slate-200 bg-white px-4 py-16 dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue-2)] sm:px-6 lg:px-8 lg:py-24"
        >
          <div className="landing-container">
            <FeaturesContent />
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="border-t border-slate-200 px-4 py-16 dark:border-[var(--dark-blue-3)] sm:px-6 lg:px-8 lg:py-24"
        >
          <div className="landing-container">
            <HowItWorksContent />
          </div>
        </section>

        {/* Video guidance – how it will work */}
        <section
          id="video-guidance"
          className="border-t border-slate-200 bg-white px-4 py-16 dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue-2)] sm:px-6 lg:px-8 lg:py-24"
        >
          <div className="landing-container">
            <VideoGuidanceContent />
          </div>
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          ref={pricingRef}
          className="border-t border-slate-200 bg-white px-4 py-16 dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue-2)] sm:px-6 lg:px-8 lg:py-24"
        >
          <div className="landing-container">
            <div className={`text-center mb-14 transition-all duration-700 ${reveal(pricingInView)}`}>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Simple pricing
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-slate-600 dark:text-slate-400">
                Start free with Beta. Create an account — no credit card required.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
              {PLANS.map((plan, i) => (
                <div
                  key={plan.id}
                  className={`text-left rounded-2xl border-2 p-6 transition-all duration-500 flex flex-col ${
                    plan.highlighted ? "border-[var(--dark-blue)] dark:border-white bg-[var(--dark-blue)]/5 dark:bg-white/5 shadow-lg ring-2 ring-[var(--dark-blue)]/20 dark:ring-white/20" : "border-slate-200 dark:border-[var(--dark-blue-3)] bg-slate-50 dark:bg-[var(--dark-blue)] hover:border-slate-300 dark:hover:border-[var(--dark-blue-4)] hover:shadow-lg"
                  } ${pricingInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                  style={revealDelay(pricingInView, 100 + 80 * i)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-black text-lg text-slate-900 dark:text-white">
                      {plan.name}
                    </span>
                    {plan.free && (
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        Free
                      </span>
                    )}
                  </div>
                  <div className="mb-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {plan.currency && `${plan.currency} `}
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                    {plan.description}
                  </p>
                  <ul className="space-y-2 flex-1">
                    {plan.features.map((feature, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                      >
                        <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    {plan.free ? (
                      <button
                        type="button"
                        onClick={() => openSignUp(plan.id)}
                        className="w-full rounded-xl bg-[var(--dark-blue)] py-3 px-4 font-bold text-white hover:opacity-90 transition-opacity dark:bg-white dark:text-[var(--dark-blue)]"
                      >
                        Create free account
                      </button>
                    ) : plan.id === "enterprise" ? (
                      <a
                        href="mailto:sales@waseel.ai?subject=Enterprise plan"
                        className="block w-full rounded-xl border-2 border-slate-200 dark:border-[var(--dark-blue-3)] py-3 px-4 font-bold text-center text-slate-800 hover:bg-slate-50 dark:text-white dark:hover:bg-[var(--dark-blue-3)] transition-colors"
                      >
                        Contact sales
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openSignUp(plan.id)}
                        className="w-full rounded-xl bg-[var(--dark-blue)] py-3 px-4 font-bold text-white hover:opacity-90 transition-opacity dark:bg-white dark:text-[var(--dark-blue)]"
                      >
                        Get started
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section ref={testimonialsRef} className="border-t border-slate-200 px-4 py-16 dark:border-[var(--dark-blue-3)] sm:px-6 lg:px-8 lg:py-24">
          <div className="landing-container">
            <div className={`text-center mb-14 transition-all duration-700 ${reveal(testimonialsInView)}`}>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Loved by businesses in the Gulf
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-slate-600 dark:text-slate-400">
                See what teams are saying about Waseel.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <blockquote
                  key={t.author}
                  className={`rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-500 hover:shadow-lg dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue-2)] ${testimonialsInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                  style={revealDelay(testimonialsInView, 150 * i)}
                >
                  <p className="text-slate-700 dark:text-slate-300">&ldquo;{t.quote}&rdquo;</p>
                  <footer className="mt-4">
                    <p className="font-bold text-slate-900 dark:text-white">{t.author}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t.role}</p>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        {/* About */}
        <section
          id="about"
          ref={aboutRef}
          className="border-t border-slate-200 bg-white px-4 py-16 dark:border-[var(--dark-blue-3)] dark:bg-[var(--dark-blue-2)] sm:px-6 lg:px-8 lg:py-24"
        >
          <div className={`landing-container max-w-3xl mx-auto text-center transition-all duration-700 ${reveal(aboutInView)}`}>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Built for Saudi and Gulf sellers
            </h2>
            <p className="mt-6 text-slate-600 dark:text-slate-400">
              Waseel is designed for businesses that sell on WhatsApp and social media. We support SAR, AED, and USD. Our AI understands Arabic and English so you can talk to customers in their language. Start with a free trial — no credit card required.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-2">
                <Shield size={20} /> Secure & compliant
              </span>
              <span className="flex items-center gap-2">
                <Zap size={20} /> Setup in minutes
              </span>
              <span className="flex items-center gap-2">
                <Users size={20} /> Trusted by 500+ businesses
              </span>
            </div>
          </div>
        </section>

        {/* Contact / CTA */}
        <section
          id="contact"
          ref={contactRef}
          className="border-t border-slate-200 px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
        >
          <div className={`landing-container max-w-2xl mx-auto text-center transition-all duration-700 ${reveal(contactInView)}`}>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Ready to sell smarter?
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              Create a free account or log in to access your dashboard.
            </p>
            <button
              type="button"
              onClick={scrollToPricing}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[var(--dark-blue)] px-8 py-4 text-base font-bold text-white hover:opacity-90 transition-opacity dark:bg-white dark:text-[var(--dark-blue)]"
            >
              Go to pricing
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      </main>

      <WebsiteFooter />
    </div>
  )
}
