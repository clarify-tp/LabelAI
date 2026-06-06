/**
 * src/components/ui/BackToTop.jsx
 * ================================
 * Floating back-to-top button. Appears after scrolling 400px.
 * GSAP handles fade-in / fade-out animation.
 */
import React, { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { gsap } from 'gsap'

export default function BackToTop() {
  const btnRef = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!btnRef.current) return
    gsap.to(btnRef.current, { opacity: visible ? 1 : 0, y: visible ? 0 : 16, duration: 0.25, ease: 'power2.out' })
  }, [visible])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <button
      ref={btnRef}
      onClick={scrollToTop}
      title="Back to top"
      className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg flex items-center justify-center transition-colors opacity-0"
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
    >
      <ArrowUp size={18} />
    </button>
  )
}
