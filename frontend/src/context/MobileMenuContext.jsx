import { createContext, useContext, useState, useCallback } from 'react'

const MobileMenuContext = createContext(null)

export function MobileMenuProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])
  return (
    <MobileMenuContext.Provider value={{ isOpen, setIsOpen, toggle }}>
      {children}
    </MobileMenuContext.Provider>
  )
}

export function useMobileMenu() {
  const ctx = useContext(MobileMenuContext)
  if (!ctx) return { isOpen: false, setIsOpen: () => {}, toggle: () => {} }
  return ctx
}
