import { createContext, useContext, useState, useCallback } from 'react'

const AuthModalContext = createContext(null)

export function AuthModalProvider({ children }) {
  const [state, setState] = useState({ isOpen: false, mode: 'login', plan: 'beta' })

  const openLogin = useCallback(() => {
    setState({ isOpen: true, mode: 'login', plan: 'beta' })
  }, [])

  const openSignUp = useCallback((plan = 'beta') => {
    setState({ isOpen: true, mode: 'signup', plan })
  }, [])

  const close = useCallback(() => {
    setState((s) => ({ ...s, isOpen: false }))
  }, [])

  return (
    <AuthModalContext.Provider value={{ ...state, openLogin, openSignUp, close }}>
      {children}
    </AuthModalContext.Provider>
  )
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext)
  if (!ctx) return { isOpen: false, mode: 'login', plan: 'beta', openLogin: () => {}, openSignUp: () => {}, close: () => {} }
  return ctx
}
