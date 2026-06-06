/**
 * src/components/ui/LoadingSpinner.jsx
 * ======================================
 * Animated loading indicator with optional message.
 * Used during scan operations with Revant-style messages.
 */
import React, { useState, useEffect } from 'react'
import { Leaf } from 'lucide-react'

const SCAN_MESSAGES = [
  'Ingredient padhna chal raha hai... 👀',
  'FSSAI database se match ho raha hai...',
  "Revant ki nazar se dekh rahe hain...",
  'Score calculate ho raha hai...',
  'Verdict taiyaar ho raha hai...',
]

export default function LoadingSpinner({ rotating = true, message = null }) {
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    if (!rotating) return
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % SCAN_MESSAGES.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [rotating])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-green-100 dark:border-green-900 border-t-green-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Leaf size={20} className="text-green-500" />
        </div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-xs transition-all duration-500">
        {message || SCAN_MESSAGES[msgIndex]}
      </p>
    </div>
  )
}
