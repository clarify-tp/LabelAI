/**
 * src/components/scan/VerdictCard.jsx  (FIXED)
 * ==============================================
 * Fixes:
 *   1. Added ConsumptionFrequency display below score circle.
 *      Reads consumption_frequency from scan result and shows
 *      label + detail + emoji in a coloured badge.
 *   2. Score circle and product header layout improved for mobile.
 */
import React, { useRef, useEffect } from 'react'
import { Share2, ExternalLink, AlertTriangle, Calendar } from 'lucide-react'
import { gsap } from 'gsap'
import html2canvas from 'html2canvas'
import toast from 'react-hot-toast'
import ScoreCircle from '../ui/ScoreCircle'

/** Consumption frequency badge */
function FrequencyBadge({ frequency }) {
  if (!frequency) return null

  const colorMap = {
    GREEN:  'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400',
    ORANGE: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400',
    RED:    'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400',
  }

  const cls = colorMap[frequency.color] || colorMap.ORANGE

  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-xl border ${cls}`}>
      <Calendar size={16} className="flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold leading-tight">
          {frequency.emoji} How often: {frequency.label}
        </p>
        <p className="text-xs mt-0.5 opacity-80 leading-snug">{frequency.detail}</p>
      </div>
    </div>
  )
}

export default function VerdictCard({ result }) {
  const cardRef  = useRef(null)
  const shareRef = useRef(null)

  const {
    score, score_band, verdict_text,
    reasons_to_eat    = [],
    reasons_to_avoid  = [],
    side_effects      = [],
    product,
    consumption_frequency,
  } = result

  // Animate card on mount
  useEffect(() => {
    if (!cardRef.current) return
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 24, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' }
    )
  }, [])

  const handleShare = async () => {
    if (!shareRef.current) return
    try {
      toast.loading('Generating share card…')
      const canvas = await html2canvas(shareRef.current, {
        backgroundColor: null, scale: 2, useCORS: true,
      })
      toast.dismiss()
      const url  = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `label-padhega-${product?.barcode || 'score'}.png`
      link.href = url
      link.click()
      toast.success('Share card downloaded!')
    } catch {
      toast.dismiss()
      toast.error('Could not generate share card')
    }
  }

  return (
    <div ref={cardRef} className="space-y-4">

      {/* Shareable region */}
      <div
        ref={shareRef}
        className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
      >
        {/* Score header */}
        <div className={`px-5 py-5 flex items-center justify-between gap-4 ${
          score_band === 'GREEN'  ? 'bg-green-50 dark:bg-green-900/20'
          : score_band === 'ORANGE' ? 'bg-orange-50 dark:bg-orange-900/20'
          : 'bg-red-50 dark:bg-red-900/20'
        }`}>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-tight truncate">
              {product?.product_name || 'Product'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {product?.brand}
            </p>
          </div>
          <div className="flex-shrink-0">
            <ScoreCircle score={score} size="md" />
          </div>
        </div>

        {/* Verdict text */}
        {verdict_text && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-start gap-2">
              <span className="text-2xl flex-shrink-0">🎤</span>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">
                "{verdict_text}"
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Consumption frequency — shown outside shareable region */}
      <FrequencyBadge frequency={consumption_frequency} />

      {/* Reasons to eat */}
      {reasons_to_eat.length > 0 && (
        <div className="rounded-2xl border border-green-200 dark:border-green-800 overflow-hidden">
          <div className="px-4 py-2.5 bg-green-50 dark:bg-green-900/20">
            <h3 className="font-semibold text-green-700 dark:text-green-400 text-sm">
              ✅ Reasons to eat
            </h3>
          </div>
          <div className="divide-y divide-green-100 dark:divide-green-900/30">
            {reasons_to_eat.map((r, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-2">
                <span className="text-base flex-shrink-0">{r.icon}</span>
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{r.text}</p>
                  {r.source && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Source: {r.source}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reasons to avoid */}
      {reasons_to_avoid.length > 0 && (
        <div className="rounded-2xl border border-red-200 dark:border-red-800 overflow-hidden">
          <div className="px-4 py-2.5 bg-red-50 dark:bg-red-900/20">
            <h3 className="font-semibold text-red-700 dark:text-red-400 text-sm">
              🚫 Reasons to avoid
            </h3>
          </div>
          <div className="divide-y divide-red-100 dark:divide-red-900/30">
            {reasons_to_avoid.map((r, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-2">
                <span className="text-base flex-shrink-0">{r.icon}</span>
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{r.text}</p>
                  {r.source && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Source: {r.source}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Side effects */}
      {side_effects.length > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 overflow-hidden">
          <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
            <h3 className="font-semibold text-amber-700 dark:text-amber-400 text-sm">
              Confirmed Side Effects
            </h3>
          </div>
          <div className="divide-y divide-amber-100 dark:divide-amber-900/30">
            {side_effects.map((se, i) => (
              <div key={i} className="px-4 py-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    se.evidence_level === 'CONFIRMED'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  }`}>
                    {se.evidence_level}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {se.ingredient}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{se.effect}</p>
                {se.condition && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">When: {se.condition}</p>
                )}
                {se.source_url ? (
                  <a
                    href={se.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink size={10} /> {se.source}
                  </a>
                ) : se.source ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500">Source: {se.source}</p>
                ) : null}
              </div>
            ))}
          </div>
          <p className="px-4 py-2 text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/10">
            Only CONFIRMED and PROBABLE effects shown. All backed by peer-reviewed research.
          </p>
        </div>
      )}

      {/* Share button */}
      <button
        onClick={handleShare}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <Share2 size={16} /> Share verdict card
      </button>
    </div>
  )
}