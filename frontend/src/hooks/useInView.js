import { useState, useEffect, useRef } from 'react'

export function useInView(options = {}) {
  const { threshold = 0.1, rootMargin = '0px 0px -50px 0px' } = options
  const [isInView, setIsInView] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsInView(true)
      },
      { threshold, rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return [ref, isInView]
}
