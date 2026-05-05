import { Routes, Route, Outlet, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import { AppSidebar } from './components/Sidebar'
import AuthModal from './components/AuthModal'
import { MobileMenuProvider } from './context/MobileMenuContext'
import { useAuth } from './context/AuthContext'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import ManageProducts from './pages/ManageProducts'
import Stores from './pages/Stores'
import Services from './pages/Services'
import ManageServices from './pages/ManageServices'
import WhatsAppAI from './pages/WhatsAppAI'
import VideoAds from './pages/VideoAds'
import Settings from './pages/Settings'
import ResetPassword from './pages/ResetPassword'

function AppLayout() {
  return (
    <MobileMenuProvider>
      <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans dark:bg-[var(--dark-blue)] dark:text-white">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 md:ml-64">
          <Navbar />
          <main className="flex-1 p-4 md:p-8 overflow-x-hidden bg-white dark:bg-[var(--dark-blue-2)]">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </MobileMenuProvider>
  )
}

function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[var(--dark-blue)]">
        <div className="text-slate-500 dark:text-slate-400">Loading…</div>
      </div>
    )
  }
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return <AppLayout />
}

function App() {
  return (
    <>
      <AuthModal />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={<ProtectedLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="manage-products" element={<ManageProducts />} />
        <Route path="stores" element={<Stores />} />
        <Route path="services" element={<Services />} />
        <Route path="manage-services" element={<ManageServices />} />
        <Route path="whatsapp" element={<WhatsAppAI />} />
        <Route path="video-ads" element={<VideoAds />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}

export default App
