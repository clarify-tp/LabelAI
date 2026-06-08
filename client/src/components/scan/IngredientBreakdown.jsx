/**
 * src/components/scan/IngredientBreakdown.jsx
 * =============================================
 * Renders the full matched ingredient list with colour-coded badges.
 * GREEN = harm level 1 (safe), YELLOW = 2, ORANGE = 3, RED = 4.
 * Each harmful ingredient shows its reason. Expert-flagged items get a star.
 * Tap any ingredient to open the deep-dive drawer (Task 5).
 *
 * Props:
 *   matchedIngredients : array of matched FSSAI ingredient objects
 */
import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Star } from 'lucide-react'
import IngredientDetailDrawer from './IngredientDetailDrawer'

const COLOR_MAP = {
  GREEN:  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  YELLOW: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  ORANGE: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  RED:    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
}

export default function IngredientBreakdown({ matchedIngredients = [] }) {
  const [expanded, setExpanded] = useState(false)
  const [active, setActive]     = useState(null)

  const harmful = matchedIngredients.filter(i => (i.harm_level || 1) >= 3)
  const safe    = matchedIngredients.filter(i => (i.harm_level || 1) < 3)
  const shown   = expanded ? matchedIngredients : matchedIngredients.slice(0, 8)

  if (!matchedIngredients.length) return null

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
          Ingredient Breakdown
        </h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-red-600 dark:text-red-400 font-medium">{harmful.length} flagged</span>
          <span className="text-gray-400">·</span>
          <span className="text-green-600 dark:text-green-400">{safe.length} clean</span>
        </div>
      </div>

      {/* Ingredient tags */}
      <div className="p-4">
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Tap an ingredient for details</p>
        <div className="flex flex-wrap gap-2">
          {shown.map((ing, i) => {
            const color = COLOR_MAP[ing.color_code] || COLOR_MAP.GREEN
            const isExpert = ing.expert_concern === 'YES'
            return (
              <button
                key={i}
                onClick={() => setActive(ing)}
                title={ing.harm_reason || 'Generally safe — tap for details'}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 dark:hover:ring-gray-600 transition-all ${color}`}
              >
                {isExpert && <Star size={10} className="fill-current" />}
                {ing.name_english || ing.raw_name}
                {ing.ins_no && !['SAFE_BASE','UNKNOWN','UNKNOWN_ADDITIVE'].includes(ing.ins_no) && (
                  <span className="opacity-60">({ing.ins_no})</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Show more toggle */}
        {matchedIngredients.length > 8 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="mt-3 flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:underline"
          >
            {expanded ? <><ChevronUp size={13}/>Show less</> : <><ChevronDown size={13}/>Show all {matchedIngredients.length} ingredients</>}
          </button>
        )}

        {/* Legend */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
          {[['GREEN','Safe'],['YELLOW','Low concern'],['ORANGE','Medium concern'],['RED','Avoid']].map(([c,l]) => (
            <span key={c} className="flex items-center gap-1">
              <span className={`w-2.5 h-2.5 rounded-full ${c==='GREEN'?'bg-green-500':c==='YELLOW'?'bg-yellow-500':c==='ORANGE'?'bg-orange-500':'bg-red-500'}`}/>
              {l}
            </span>
          ))}
          <span className="flex items-center gap-1"><Star size={10} className="text-yellow-500 fill-current"/>Expert flagged</span>
        </div>
      </div>

      <IngredientDetailDrawer ingredient={active} onClose={() => setActive(null)} />
    </div>
  )
}
