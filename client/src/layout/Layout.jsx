/**
 * src/layout/Layout.jsx
 * =====================
 * Root layout wrapper — clean, professional, foody theme
 * No gradients, minimal shadows. Smooth GSAP animations.
 */

import React, { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { gsap } from 'gsap'
import { ChefHat, Sparkles } from 'lucide-react'
import Navbar      from '../components/layout/Navbar'
import Breadcrumb  from '../components/layout/Breadcrumb'
import Footer      from '../components/layout/Footer'
import BackToTop   from '../components/ui/BackToTop'
import KeyboardShortcutsGuide from '../components/ui/KeyboardShortcutsGuide'

export default function Layout() {
  const navRef   = useRef(null)
  const location = useLocation()
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const isHomePage = location.pathname === '/'

  // GSAP: animate navbar on mount
  useEffect(() => {
    if (!navRef.current) return
    gsap.fromTo(
      navRef.current,
      { y: -40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
    )
  }, [])

  // GSAP: animate main content on route change
  useEffect(() => {
    const mainContent = document.querySelector('.layout-main')
    if (mainContent) {
      gsap.fromTo(
        mainContent,
        { opacity: 0, y: 15 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.4, 
          ease: 'power2.out',
          clearProps: 'all'
        }
      )
    }
  }, [location.pathname])

  // Track scroll for dynamic background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Keyboard shortcut: ? → show shortcuts guide
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '?' && !e.target.matches('input, textarea')) {
        e.preventDefault()
        setShowShortcuts((v) => !v)
      }
      if (e.key === 'Escape') setShowShortcuts(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-gray-950">
      {/* Subtle top accent line for non-home pages */}
      {!isHomePage && (
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-emerald-500 z-50" />
      )}

      {/* Navbar with scroll effect — clean, no blur */}
      <div 
        ref={navRef} 
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled 
            ? 'bg-white/95 dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800' 
            : 'bg-transparent'
        }`}
      >
        <Navbar onShowShortcuts={() => setShowShortcuts(true)} />
      </div>

      {/* Breadcrumb — clean */}
      {!isHomePage && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 inline-block border border-gray-200 dark:border-gray-700">
            <Breadcrumb />
          </div>
        </div>
      )}

      {/* Decorative separator for non-home pages */}
      {!isHomePage && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <div className="h-px bg-gray-200 dark:bg-gray-800" />
        </div>
      )}

      {/* Main content */}
      <main className="layout-main flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <Footer />
      </footer>

      {/* Back to top button */}
      <BackToTop />

      {/* Keyboard shortcuts guide overlay */}
      {showShortcuts && (
        <KeyboardShortcutsGuide onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  )
}