/**
 * src/components/ui/CategoryPicker.jsx
 * =====================================
 * Grid of category buttons for the scan page.
 * User selects a category before scanning to enable category-aware scoring.
 *
 * Props:
 *   value    : currently selected category slug
 *   onChange : callback(slug)
 */
import React from 'react'

export const CATEGORIES = [
  { slug: 'biscuit',          label: 'Biscuits',       emoji: '🍪' },
  { slug: 'chips_namkeen',    label: 'Chips & Namkeen', emoji: '🍟' },
  { slug: 'cold_drink',       label: 'Cold Drinks',     emoji: '🥤' },
  { slug: 'health_drink',     label: 'Health Drinks',   emoji: '💪' },
  { slug: 'instant_noodles',  label: 'Instant Noodles', emoji: '🍜' },
  { slug: 'breakfast_cereal', label: 'Cereals',         emoji: '🥣' },
  { slug: 'dairy',            label: 'Dairy',           emoji: '🥛' },
  { slug: 'protein_powder',   label: 'Protein Powder',  emoji: '🏋️' },
  { slug: 'sauce_ketchup',    label: 'Sauces',          emoji: '🥫' },
  { slug: 'chocolate',        label: 'Chocolate',       emoji: '🍫' },
  { slug: 'baby_food',        label: 'Baby Food',       emoji: '👶' },
  { slug: 'general',          label: 'Other',           emoji: '🛒' },
]

export default function CategoryPicker({ value, onChange }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Select category for accurate scoring
      </p>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {CATEGORIES.map(({ slug, label, emoji }) => (
          <button
            key={slug}
            onClick={() => onChange(slug)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all ${
              value === slug
                ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-green-300 dark:hover:border-green-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <span className="text-xl leading-none">{emoji}</span>
            <span className="leading-tight text-center">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
