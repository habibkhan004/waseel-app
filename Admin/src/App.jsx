import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import { AdminAuthProvider, useAdminAuth } from "./context/AdminAuthContext"
import { AdminSidebar } from "./components/AdminSidebar"
import { AdminHeader } from "./components/AdminHeader"
import { ApiConfigProvider } from "./context/ApiConfigContext"
import { PlansProvider } from "./context/PlansContext"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Users from "./pages/Users"
import Plans from "./pages/Plans"
import ApiManagement from "./pages/ApiManagement"
import Analytics from "./pages/Analytics"
import Audit from "./pages/Audit"
import Settings from "./pages/Settings"

const routeTitles = {
  "/": { title: "Dashboard", subtitle: "Overview & KPIs" },
  "/users": { title: "Users", subtitle: "Manage accounts" },
  "/plans": { title: "Plans & Billing", subtitle: "Subscriptions" },
  "/api-management": { title: "API Management", subtitle: "Claude, OpenAI, Runway, Meta, ElevenLabs" },
  "/analytics": { title: "Analytics", subtitle: "Reports" },
  "/audit": { title: "Audit & Security", subtitle: "Activity log" },
  "/settings": { title: "Settings", subtitle: "Configuration" },
}

function AdminLayout() {
  const { pathname } = useLocation()
  const { title, subtitle } = routeTitles[pathname] || { title: "Admin", subtitle: "" }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[var(--admin-primary)]">
      <AdminSidebar />
      <div className="md:pl-64 min-h-screen flex flex-col">
        <AdminHeader title={title} subtitle={subtitle} />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/api-management" element={<ApiManagement />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function ProtectedLayout() {
  const { isAuthenticated, loading } = useAdminAuth()
  const { pathname } = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[var(--admin-primary)] flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400 font-medium">Loading…</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: { pathname } }} replace />
  }

  return <AdminLayout />
}

function App() {
  return (
    <AdminAuthProvider>
      <ApiConfigProvider>
        <PlansProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </PlansProvider>
      </ApiConfigProvider>
    </AdminAuthProvider>
  )
}

export default App
