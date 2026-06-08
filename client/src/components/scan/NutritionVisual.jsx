/**
 * src/components/scan/NutritionVisual.jsx  (FIXED)
 * ==================================================
 * Fixes:
 *   1. Fat display no longer shows "0.0 tablespoons" for small values.
 *      Uses the backend's display string directly (which handles small
 *      values with 2dp precision).
 *
 *   2. Shows actual serving size used in calculation as a note
 *      so users can verify against the physical label.
 *
 *   3. Fat bar is now visible even for small amounts — previously
 *      0.0 showed an empty bar which was confusing.
 *
 *   4. Calories now correctly reflects per-serving (not per-100g).
 */
import React from 'react'
import { Info } from 'lucide-react'
import Tooltip from '../ui/Tooltip'

function MetricBar({ label, display, pctDaily, icon, danger = false, warn = false }) {
  const pct = Math.min(pctDaily || 0, 100)

  const barColor =
    danger ? 'bg-red-500' :
    warn   ? 'bg-orange-400' :
    pct > 75 ? 'bg-orange-400' :
    pct > 40 ? 'bg-yellow-400' :
    'bg-green-500'

  const textColor =
    danger || pct > 75 ? 'text-red-500 dark:text-red-400' :
    pct > 40            ? 'text-yellow-600 dark:text-yellow-400' :
    'text-gray-500 dark:text-gray-400'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium">
          <span>{icon}</span>
          <span>{display}</span>
          {danger && <span className="text-red-500 text-xs">⚠️</span>}
        </span>
        <span className={`text-xs font-medium ${textColor}`}>
          {pctDaily}% daily
        </span>
      </div>
      {/* Always show a bar — minimum 2% width so even tiny values are visible */}
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
        />
      </div>
    </div>
  )
}

export default function NutritionVisual({ humanisedNutrition: hn, servingDescription }) {
  if (!hn) return null

  const { sugar, sodium, fat, protein, fiber, calories, trans_fat } = hn

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
          Nutrition — Per Serving
        </h3>
        {servingDescription && (
          <Tooltip text={`Serving size: ${servingDescription}`} position="left">
            <button className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              <Info size={13} /> Serving
            </button>
          </Tooltip>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Sugar — always shown first (the headline metric) */}
        {sugar && (
          <MetricBar
            label="Sugar"
            display={sugar.display}
            pctDaily={sugar.pct_daily}
            icon="🍬"
            danger={sugar.pct_daily > 80}
            warn={sugar.pct_daily > 50}
          />
        )}

        {/* Sodium */}
        {sodium && (
          <MetricBar
            label="Salt"
            display={sodium.display}
            pctDaily={sodium.pct_daily}
            icon="🧂"
            danger={sodium.pct_daily > 75}
            warn={sodium.pct_daily > 40}
          />
        )}

        {/* Fat — use backend display string which handles small values correctly */}
        {fat && (
          <MetricBar
            label="Fat"
            display={fat.display}   /* backend already formats this correctly */
            pctDaily={fat.pct_daily}
            icon="🛢️"
            danger={false}
            warn={fat.pct_daily > 50}
          />
        )}

        {/* Trans fat warning — absolute red flag */}
        {trans_fat?.present && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <span className="text-lg">🚨</span>
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                Trans Fat: {trans_fat.value_g}g per serving
              </p>
              <p className="text-xs text-red-600 dark:text-red-500">
                WHO recommends zero trans fat. Being phased out globally.
              </p>
            </div>
          </div>
        )}

        {/* Protein */}
        {protein && (
          <MetricBar
            label="Protein"
            display={`${protein.value_g}g protein`}
            pctDaily={protein.pct_daily}
            icon="💪"
          />
        )}

        {/* Fiber */}
        {fiber && fiber.value_g > 0 && (
          <MetricBar
            label="Fibre"
            display={`${fiber.value_g}g fibre`}
            pctDaily={fiber.pct_daily}
            icon="🌾"
          />
        )}

        {/* Calories */}
        {calories && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>🔥 {calories.value_kcal} kcal per serving</span>
            <span>{calories.pct_daily}% of daily calories</span>
          </div>
        )}

        {/* Reference footnote */}
        <p className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700 pt-2">
          1 tsp sugar = 4.2g · 1 pinch salt = 0.5g · 1 tbsp oil = 14g ·{' '}
          <a href="/reference" className="underline hover:text-green-600 dark:hover:text-green-400">
            See full reference →
          </a>
        </p>
      </div>
    </div>
  )
}