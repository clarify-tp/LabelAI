/**
 * src/components/scan/IngredientDetailDrawer.jsx
 * ==============================================
 * Ingredient deep-dive (Task 5). Bottom sheet on mobile, right sidebar on
 * desktop. Shows everything we know about a single matched FSSAI ingredient.
 *
 * Props:
 *   ingredient : matched ingredient object (or null → closed)
 *   onClose()  : close handler
 */
import React, { useEffect } from 'react'
import { X, ShieldCheck, ShieldAlert, AlertTriangle, FlaskConical, Star } from 'lucide-react'

const HARM_META = {
  1: { label: 'Safe',           color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-900/20',  Icon: ShieldCheck },
  2: { label: 'Low concern',    color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20', Icon: ShieldAlert },
  3: { label: 'Medium concern', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', Icon: AlertTriangle },
  4: { label: 'Avoid',          color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-900/20',      Icon: AlertTriangle },
}

function Row({ label, children }) {
  if (!children) return null
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-700 dark:text-gray-300">{children}</p>
    </div>
  )
}

export default function IngredientDetailDrawer({ ingredient, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    if (ingredient) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ingredient, onClose])

  if (!ingredient) return null

  const harm = Math.min(Math.max(ingredient.harm_level || 1, 1), 4)
  const meta = HARM_META[harm]
  const HarmIcon = meta.Icon
  const ins = ingredient.ins_no
  const hasIns = ins && !['SAFE_BASE', 'UNKNOWN', 'UNKNOWN_ADDITIVE'].includes(ins)
  const isExpert = ingredient.expert_concern === 'YES'

  return (
    <div className="fixed inset-0 z-[60] flex sm:justify-end" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet / sidebar */}
      <div className="relative w-full sm:max-w-md mt-auto sm:mt-0 sm:h-full bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-none shadow-2xl overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
        <div className={`px-5 py-4 ${meta.bg} flex items-start justify-between gap-3`}>
          <div className="flex items-start gap-2">
            <HarmIcon size={22} className={`${meta.color} flex-shrink-0 mt-0.5`} />
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 leading-tight">
                {ingredient.name_english || ingredient.raw_name || 'Ingredient'}
                {isExpert && <Star size={13} className="inline-block ml-1 text-yellow-500 fill-current" />}
              </h3>
              {ingredient.name_hindi && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{ingredient.name_hindi}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-gray-500" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${meta.bg} ${meta.color}`}>
              Harm level {harm}/4 · {meta.label}
            </span>
            {hasIns && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                INS {ins}{ingredient.e_number ? ` · ${ingredient.e_number}` : ''}
              </span>
            )}
          </div>

          <Row label="Functional class">{ingredient.functional_class}</Row>
          <Row label="Why it's a concern">{ingredient.harm_reason}</Row>

          <Row label="FSSAI status">
            {ingredient.fssai_permitted === false
              ? 'Not permitted by FSSAI in India'
              : 'Permitted by FSSAI in India'}
          </Row>

          {isExpert && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <Star size={15} className="text-yellow-500 fill-current flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Flagged by nutrition experts — worth limiting in your daily diet.
              </p>
            </div>
          )}

          {Array.isArray(ingredient.side_effects) && ingredient.side_effects.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                Confirmed side effects
              </p>
              {ingredient.side_effects.map((se, i) => (
                <div key={i} className="text-sm text-gray-700 dark:text-gray-300 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                  {se.effect || String(se)}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-start gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            <FlaskConical size={15} className="flex-shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              Commonly found in packaged biscuits, snacks, beverages and ready-to-eat foods.
              Data sourced from the FSSAI India additives database.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
