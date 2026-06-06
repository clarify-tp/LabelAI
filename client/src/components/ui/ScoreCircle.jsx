/**
 * src/components/ui/ScoreCircle.jsx
 * ====================================
 * Animated circular Food Pharmer Score display.
 * Green >= 70, Orange 45-69, Red < 45.
 * GSAP counts up the number on mount.
 *
 * Props:
 *   score   : number (0-100)
 *   size    : 'sm' | 'md' | 'lg'  (default 'md')
 *   animate : boolean              (default true)
 */
import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

const SIZE_MAP = {
  sm: { circle: 'w-16 h-16', text: 'text-xl', label: 'text-xs' },
  md: { circle: 'w-28 h-28', text: 'text-3xl', label: 'text-sm'  },
  lg: { circle: 'w-40 h-40', text: 'text-5xl', label: 'text-base' },
}

function getColor(score) {
  if (score >= 70) return { ring: 'ring-green-500',  text: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-900/20',  label: 'Clean ✓',    labelColor: 'text-green-600 dark:text-green-400' }
  if (score >= 45) return { ring: 'ring-orange-400', text: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', label: 'Caution ⚠️', labelColor: 'text-orange-500 dark:text-orange-400' }
  return               { ring: 'ring-red-500',    text: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-900/20',      label: 'Avoid 🚫',   labelColor: 'text-red-600 dark:text-red-400' }
}

export default function ScoreCircle({ score = 0, size = 'md', animate = true }) {
  const numRef = useRef(null)
  const { circle, text, label } = SIZE_MAP[size] || SIZE_MAP.md
  const colors = getColor(score)

  useEffect(() => {
    if (!animate || !numRef.current) return
    const obj = { val: 0 }
    gsap.to(obj, {
      val: score, duration: 1.2, ease: 'power2.out',
      onUpdate: () => { if (numRef.current) numRef.current.textContent = Math.round(obj.val) },
    })
  }, [score, animate])

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${circle} ${colors.bg} rounded-full ring-4 ${colors.ring} flex flex-col items-center justify-center`}>
        <span ref={numRef} className={`${text} font-bold ${colors.text}`}>
          {animate ? 0 : score}
        </span>
        <span className={`${label} text-gray-400 dark:text-gray-500 leading-none`}>/100</span>
      </div>
      <span className={`text-xs font-semibold ${colors.labelColor}`}>{colors.label}</span>
    </div>
  )
}
