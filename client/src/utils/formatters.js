/**
 * src/utils/formatters.js
 * ========================
 * Pure utility functions for display formatting.
 */

/** Convert grams of sugar to teaspoons (rounded to 1dp) */
export const gToTsp = (g) => g ? (g / 4.2).toFixed(1) : '0'

/** Convert sodium mg to salt grams */
export const sodiumToSalt = (mg) => mg ? (mg / 400).toFixed(2) : '0'

/** Convert fat grams to tablespoons of oil */
export const fatToTbsp = (g) => g ? (g / 14).toFixed(1) : '0'

/** Return Tailwind colour classes for a Food Pharmer Score */
export const scoreColors = (score) => {
  if (score >= 70) return { bg: 'bg-green-500', text: 'text-green-600 dark:text-green-400', ring: 'ring-green-500', light: 'bg-green-50 dark:bg-green-900/20' }
  if (score >= 45) return { bg: 'bg-orange-400', text: 'text-orange-500 dark:text-orange-400', ring: 'ring-orange-400', light: 'bg-orange-50 dark:bg-orange-900/20' }
  return               { bg: 'bg-red-500',    text: 'text-red-600 dark:text-red-400',    ring: 'ring-red-500',    light: 'bg-red-50 dark:bg-red-900/20' }
}

/** Truncate text to maxLen with ellipsis */
export const truncate = (str, maxLen = 40) =>
  str && str.length > maxLen ? str.slice(0, maxLen) + '…' : str || ''

/** Capitalise first letter */
export const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : ''

/** Format ISO date string to human-readable */
export const fmtDate = (iso) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return iso }
}
