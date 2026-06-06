/**
 * src/components/ui/Tooltip.jsx
 * ================================
 * Simple hover tooltip wrapper.
 * Usage: <Tooltip text="Explain something"><button>?</button></Tooltip>
 */
import React, { useState } from 'react'

export default function Tooltip({ text, children, position = 'top' }) {
  const [visible, setVisible] = useState(false)

  const posClass = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position]

  return (
    <div className="relative inline-flex" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <div className={`absolute ${posClass} z-50 px-2.5 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-700 text-white text-xs whitespace-nowrap shadow-lg pointer-events-none max-w-xs`}>
          {text}
          <div className="absolute inset-0 -z-10" />
        </div>
      )}
    </div>
  )
}
