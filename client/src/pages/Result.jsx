/**
 * src/pages/Result.jsx
 * =====================
 * Full scan result page. Shows verdict card, nutrition visual,
 * ingredient breakdown, compare tray add button, and chat link.
 * Redirects to Home if no scan result in Redux state.
 */
import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, GitCompare, ArrowLeft } from 'lucide-react'
import { addToCompare } from '../store/slices/compareSlice'
import { setActiveBarcode } from '../store/slices/chatSlice'
import VerdictCard from '../components/scan/VerdictCard'
import NutritionVisual from '../components/scan/NutritionVisual'
import IngredientBreakdown from '../components/scan/IngredientBreakdown'

export default function Result() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const result   = useSelector(s => s.scan.current)

  if (!result) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-gray-500 dark:text-gray-400">No scan result yet.</p>
        <button onClick={() => navigate('/')} className="text-green-600 dark:text-green-400 hover:underline text-sm">
          ← Go scan something
        </button>
      </div>
    )
  }

  const handleCompare = () => {
    dispatch(addToCompare({
      barcode:            result.product?.barcode,
      product_name:       result.product?.product_name,
      brand:              result.product?.brand,
      food_pharmer_score: result.score,
      nutrition:          result.product?.nutrition,
      matched_ingredients: result.matched_ingredients,
    }))
  }

  const handleChat = () => {
    dispatch(setActiveBarcode(result.product?.barcode))
    navigate('/chat')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Back button */}
      <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
        <ArrowLeft size={15} /> Scan another product
      </button>

      {/* Verdict + reasons + side effects */}
      <VerdictCard result={result} />

      {/* Nutrition visual */}
      <NutritionVisual
        humanisedNutrition={result.humanised_nutrition}
        servingDescription={result.serving_description}
      />

      {/* Ingredient breakdown */}
      <IngredientBreakdown matchedIngredients={result.matched_ingredients || []} />

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleCompare}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
        >
          <GitCompare size={16} /> Add to Compare
        </button>
        <button
          onClick={handleChat}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
        >
          <MessageCircle size={16} /> Ask about this
        </button>
      </div>
    </div>
  )
}
