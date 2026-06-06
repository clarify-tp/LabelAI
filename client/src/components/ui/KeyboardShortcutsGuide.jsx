/**
 * src/components/ui/KeyboardShortcutsGuide.jsx
 * ==============================================
 * Modal overlay listing all keyboard shortcuts.
 * Toggle with ? key. Close with Escape or X button.
 */
import React, { useEffect, useRef } from 'react'
import { X, Keyboard } from 'lucide-react'
import { gsap } from 'gsap'

const SHORTCUTS = [
  { key: '?',        desc: 'Show / hide this guide' },
  { key: 'Escape',   desc: 'Close any modal or overlay' },
  { key: 'G + H',    desc: 'Go to Home (scan)' },
  { key: 'G + C',    desc: 'Go to Compare' },
  { key: 'G + T',    desc: 'Go to Chat' },
  { key: 'G + I',    desc: 'Go to History' },
  { key: 'D',        desc: 'Toggle dark / light mode' },
]

export default function KeyboardShortcutsGuide({ onClose }) {
  const overlayRef = useRef(null)
  const panelRef   = useRef(null)

  useEffect(() => {
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 })
    gsap.fromTo(panelRef.current,   { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(1.4)' })
  }, [])

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4" onClick={onClose}>
      <div ref={panelRef} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
            <Keyboard size={18} className="text-green-500" />
            Keyboard Shortcuts
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-gray-600 dark:text-gray-400">{desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                {key}
              </kbd>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">Press Escape to close</p>
      </div>
    </div>
  )
}
