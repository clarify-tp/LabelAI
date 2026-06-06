/**
 * src/hooks/useKeyboardShortcuts.js
 * ====================================
 * Global keyboard shortcuts for navigation and actions.
 *
 * Shortcuts:
 *   G + H  → go to Home
 *   G + C  → go to Compare
 *   G + T  → go to Chat
 *   G + I  → go to History
 *   D      → toggle dark/light mode
 *
 * Implements a two-key sequence (G then second key within 800ms).
 * Does not fire when user is typing in an input field.
 */
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { toggleTheme } from '../store/slices/themeSlice'

export default function useKeyboardShortcuts() {
  const navigate    = useNavigate()
  const dispatch    = useDispatch()
  const gPressedRef = useRef(false)
  const timerRef    = useRef(null)

  useEffect(() => {
    const isTyping = (e) =>
      e.target.matches('input, textarea, select, [contenteditable]')

    const handler = (e) => {
      if (isTyping(e)) return

      // D → toggle dark/light mode
      if (e.key === 'd' || e.key === 'D') {
        dispatch(toggleTheme())
        return
      }

      // G → start sequence
      if (e.key === 'g' || e.key === 'G') {
        gPressedRef.current = true
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => { gPressedRef.current = false }, 800)
        return
      }

      // Second key after G
      if (gPressedRef.current) {
        gPressedRef.current = false
        clearTimeout(timerRef.current)
        const map = { h: '/', H: '/', c: '/compare', C: '/compare', t: '/chat', T: '/chat', i: '/history', I: '/history' }
        if (map[e.key]) navigate(map[e.key])
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      clearTimeout(timerRef.current)
    }
  }, [navigate, dispatch])
}
