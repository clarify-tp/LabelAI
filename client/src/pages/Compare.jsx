/**
 * src/pages/Compare.jsx  (FIXED)
 * ================================
 * Fixes:
 *   1. Comparison metric table now shows product name as column header
 *      so users can tell which column belongs to which product.
 *   2. Winner badge shows score correctly.
 *   3. Ingredient diff shows product names alongside pills.
 */
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { GitCompare, X, Trophy } from 'lucide-react'
import { removeFromCompare, clearCompare, runComparison } from '../store/slices/compareSlice'
import ScoreCircle from '../components/ui/ScoreCircle'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function Compare() {
  const dispatch = useDispatch()
  const { queue, compareResult, loading } = useSelector(s => s.compare)

  const handleRun = () => {
    if (queue.length < 2) return
    dispatch(runComparison(queue.map(p => p.barcode)))
  }

  // Build ordered list of products from normalised_products in result
  const normProducts = compareResult?.result?.normalised_products || []

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <GitCompare size={22} className="text-green-500" /> Compare Products
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Add products from scan results. All values shown per 100g for a fair comparison.
        </p>
      </div>

      {/* Comparison tray */}
      {queue.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <GitCompare size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Scan a product and tap "Add to Compare" to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {queue.length} product{queue.length > 1 ? 's' : ''} in tray
            </span>
            <button
              onClick={() => dispatch(clearCompare())}
              className="text-xs text-red-500 hover:underline"
            >
              Clear all
            </button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {queue.map(p => (
              <div key={p.barcode} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {p.product_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {p.brand} · Score: {p.food_pharmer_score ?? '?'}/100
                  </p>
                </div>
                <button
                  onClick={() => dispatch(removeFromCompare(p.barcode))}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800">
            <button
              onClick={handleRun}
              disabled={queue.length < 2 || loading}
              className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
            >
              {loading ? 'Comparing…' : `Compare ${queue.length} Products`}
            </button>
          </div>
        </div>
      )}

      {loading && <LoadingSpinner message="Comparing products…" />}

      {/* Comparison result */}
      {compareResult && !loading && (
        <div className="space-y-5">
          {/* Score circles — one per product, winner highlighted */}
          {normProducts.length > 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  LabelScan Scores
                </h3>
              </div>
              <div className="p-4 grid gap-4" style={{ gridTemplateColumns: `repeat(${normProducts.length}, 1fr)` }}>
                {normProducts.map(p => {
                  const isWinner = p.barcode === compareResult.winner_barcode
                  return (
                    <div
                      key={p.barcode}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                        isWinner
                          ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {isWinner && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                          <Trophy size={12} /> Winner
                        </span>
                      )}
                      <ScoreCircle score={p.score} size="sm" />
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
                        {p.product_name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{p.brand}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Verdict text */}
          {compareResult.verdict_text && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-start gap-2">
                <span className="text-2xl">🎤</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">
                  "{compareResult.verdict_text}"
                </p>
              </div>
            </div>
          )}

          {/* Metric matrix — WITH COLUMN HEADERS */}
          {compareResult.result?.metric_matrix && normProducts.length > 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Metric Comparison
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  All values per 100g — green cell = best in each row
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      {/* Empty cell for metric label column */}
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 w-36">
                        Metric
                      </th>
                      {/* One header per product */}
                      {normProducts.map(p => (
                        <th
                          key={p.barcode}
                          className={`px-3 py-2.5 text-center text-xs font-semibold ${
                            p.barcode === compareResult.winner_barcode
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <div className="leading-tight">
                            {(p.product_name || 'Product').length > 18
                              ? (p.product_name || 'Product').slice(0, 17) + '…'
                              : (p.product_name || 'Product')}
                          </div>
                          {p.barcode === compareResult.winner_barcode && (
                            <div className="text-green-500 mt-0.5">🏆</div>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {Object.entries(compareResult.result.metric_matrix).map(([metric, data]) => (
                      <tr key={metric} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        {/* Metric label */}
                        <td className="px-4 py-3 text-xs font-medium text-gray-600 dark:text-gray-400">
                          {data.label}
                        </td>
                        {/* Value per product */}
                        {data.values.map(v => {
                          const isWinner = v.barcode === data.winner_barcode
                          return (
                            <td
                              key={v.barcode}
                              className={`px-3 py-3 text-center text-sm font-medium ${
                                isWinner
                                  ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}
                            >
                              {typeof v.value === 'number' ? v.value.toFixed(1) : (v.value ?? '—')}
                              {isWinner && <span className="ml-1 text-xs">✓</span>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ingredient diff */}
          {compareResult.result?.ingredient_diff && normProducts.length > 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Unique Harmful Ingredients
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Harmful ingredients found only in that product (not in the others)
                </p>
              </div>
              <div className="p-4 grid gap-4" style={{ gridTemplateColumns: `repeat(${normProducts.length}, 1fr)` }}>
                {normProducts.map(p => {
                  const unique = compareResult.result.ingredient_diff[p.barcode] || []
                  return (
                    <div key={p.barcode}>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 truncate">
                        {p.product_name}
                      </p>
                      {unique.length === 0 ? (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          No unique harmful ingredients ✓
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {unique.map(ing => (
                            <span
                              key={ing}
                              className="px-2 py-0.5 rounded-full text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                            >
                              {ing}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}