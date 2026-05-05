import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { AuthModalProvider } from './context/AuthModalContext.jsx'
import { ProductsProvider } from './context/ProductsContext.jsx'
import { ServicesProvider } from './context/ServicesContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AuthModalProvider>
            <ProductsProvider>
              <ServicesProvider>
                <App />
              </ServicesProvider>
            </ProductsProvider>
          </AuthModalProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
