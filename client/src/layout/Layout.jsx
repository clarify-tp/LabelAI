/**
 * src/layout/Layout.jsx
 * ✅ Breadcrumb container styled with theme colours
 * ✅ Dark class always in sync with Redux theme on mount
 */
import React, { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { gsap } from 'gsap'
import Navbar     from '../components/layout/Navbar'
import Breadcrumb from '../components/layout/Breadcrumb'
import Footer     from '../components/layout/Footer'
import BackToTop  from '../components/ui/BackToTop'
import KeyboardShortcutsGuide from '../components/ui/KeyboardShortcutsGuide'

export default function Layout() {
  const navRef   = useRef(null)
  const location = useLocation()
  const theme    = useSelector(s => s.theme.mode)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [scrolled, setScrolled]           = useState(false)

  const isHomePage = location.pathname === '/'

  /* Ensure dark class is in sync with Redux on every render (fixes toggle bug) */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  /* Animate navbar on mount */
  useEffect(() => {
    if (!navRef.current) return
    gsap.fromTo(
      navRef.current,
      { y: -40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
    )
  }, [])

  /* Animate content on route change */
  useEffect(() => {
    const el = document.querySelector('.layout-main')
    if (el) {
      gsap.fromTo(
        el,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', clearProps: 'all' }
      )
    }
  }, [location.pathname])

  /* Scroll shadow */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  /* Keyboard shortcut overlay */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '?' && !e.target.matches('input, textarea')) {
        e.preventDefault()
        setShowShortcuts(v => !v)
      }
      if (e.key === 'Escape') setShowShortcuts(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-gray-950 transition-colors duration-300">

      {/* Top accent line for inner pages */}
      {!isHomePage && (
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-500 z-50" />
      )}

      {/* Navbar */}
      <div
        ref={navRef}
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-sm'
            : 'bg-transparent'
        }`}
      >
        <Navbar onShowShortcuts={() => setShowShortcuts(true)} />
      </div>

      {/* Breadcrumb — styled with orange accent, pill shape */}
      {!isHomePage && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-1">
          <div className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-orange-100 dark:border-orange-900/30 shadow-sm">
            <Breadcrumb />
          </div>
        </div>
      )}

      {/* Thin separator under breadcrumb */}
      {!isHomePage && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-2">
          <div className="h-px bg-gradient-to-r from-orange-100 via-amber-100 to-emerald-100 dark:from-orange-900/20 dark:via-amber-900/20 dark:to-emerald-900/20" />
        </div>
      )}

      {/* Main */}
      <main className="layout-main flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors duration-300">
        <Footer />
      </footer>

      <BackToTop />

      {showShortcuts && (
        <KeyboardShortcutsGuide onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  )
}
