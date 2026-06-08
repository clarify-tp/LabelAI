/**
 * src/pages/Result.jsx
 * =====================
 * Full scan result page. Shows verdict card, nutrition visual,
 * ingredient breakdown, score-meaning guide, share actions, compare + chat.
 * Redirects to Home if no scan result in Redux state.
 */
import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  MessageCircle, GitCompare, ArrowLeft, AlertTriangle,
  ChevronDown, ChevronUp, Share2, Copy, Check
} from 'lucide-react'
import toast from 'react-hot-toast'
import { addToCompare } from '../store/slices/compareSlice'
import { setActiveBarcode } from '../store/slices/chatSlice'
import { track } from '../utils/analytics'
import VerdictCard from '../components/scan/VerdictCard'
import NutritionVisual from '../components/scan/NutritionVisual'
import IngredientBreakdown from '../components/scan/IngredientBreakdown'

const SCORE_GUIDE = [
  { range: '70–100', emoji: '🟢', label: 'Safe',    desc: 'Minimal processing, clean ingredients' },
  { range: '45–69',  emoji: '🟡', label: 'Caution', desc: 'Moderately processed — check carefully' },
  { range: '0–44',   emoji: '🔴', label: 'Avoid',   desc: 'Highly processed or harmful additives' },
]

export default function Result() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const result   = useSelector(s => s.scan.current)
  const [showGuide, setShowGuide] = useState(false)
  const [copied, setCopied] = useState(false)

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

  const score = result.score
  const verdictWord = score >= 70 ? 'Safe ✓' : score >= 45 ? 'Caution ⚠️' : 'Avoid ❌'
  const productName = result.product?.product_name || 'this product'
  const shareText =
    `I scanned ${productName} on Label Padhega!\n` +
    `Score: ${score}/100 — ${verdictWord}\n` +
    `Check your food labels: https://labelpadhega.com`

  const handleCompare = () => {
    dispatch(addToCompare({
      barcode:            result.product?.barcode,
      product_name:       result.product?.product_name,
      brand:              result.product?.brand,
      food_pharmer_score: result.score,
      nutrition:          result.product?.nutrition,
      matched_ingredients: result.matched_ingredients,
    }))
    toast.success('Added to compare tray')
  }

  const handleChat = () => {
    dispatch(setActiveBarcode(result.product?.barcode))
    navigate('/chat')
  }

  const handleNativeShare = async () => {
    track('share-native', { product: productName })
    if (navigator.share) {
      try { await navigator.share({ title: 'Label Padhega', text: shareText }) } catch { /* cancelled */ }
    } else {
      handleCopy()
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      toast.success('Result copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch { toast.error('Could not copy') }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Back button */}
      <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
        <ArrowLeft size={15} /> Scan another product
      </button>

      {/* Low-confidence banner */}
      {result.ocr_confidence === 'LOW' && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <AlertTriangle size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            Low confidence scan — some ingredients may be misread. Results are approximate.
            Rescan with a clearer photo for best accuracy.
          </p>
        </div>
      )}

      {/* USDA fallback note */}
      {result.nutrition_source === 'usda_fallback' && (
        <div className="text-xs text-gray-500 dark:text-gray-400 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          ℹ️ Nutrition not visible on the label — values estimated from the USDA FoodData Central database.
        </div>
      )}

      {/* Verdict + reasons + side effects */}
      <VerdictCard result={result} />

      {/* Score meaning — expandable */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button onClick={() => setShowGuide(v => !v)}
          className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <span>What does the LabelScan Score mean?</span>
          {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showGuide && (
          <div className="px-4 pb-4 space-y-2">
            {SCORE_GUIDE.map(g => (
              <div key={g.range} className="flex items-start gap-3 text-sm">
                <span className="text-base">{g.emoji}</span>
                <div>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{g.range} · {g.label}</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nutrition visual */}
      <NutritionVisual
        humanisedNutrition={result.humanised_nutrition}
        servingDescription={result.serving_description}
      />

      {/* Ingredient breakdown */}
      <IngredientBreakdown matchedIngredients={result.matched_ingredients || []} />

      {/* Share row */}
      <div className="flex flex-wrap gap-3">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank" rel="noopener noreferrer"
          onClick={() => track('share-whatsapp', { product: productName })}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#1ebe5b] text-white rounded-xl text-sm font-medium transition-colors"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.477-.927zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
          Share on WhatsApp
        </a>
        <button onClick={handleNativeShare}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <Share2 size={16} /> Share
        </button>
        <button onClick={handleCopy}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          {copied ? <><Check size={16} className="text-green-500" /> Copied</> : <><Copy size={16} /> Copy</>}
        </button>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={handleCompare}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
          <GitCompare size={16} /> Add to Compare
        </button>
        <button onClick={handleChat}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors">
          <MessageCircle size={16} /> Ask about this
        </button>
      </div>
    </div>
  )
}
