/**
 * src/pages/Achievements.jsx
 * ===========================
 * Gamified achievements page — uses Redux history (same as History + Insights).
 * No separate API call needed; dispatches fetchHistory on mount.
 */
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Award, Lock, ArrowLeft } from 'lucide-react'
import { fetchHistory } from '../store/slices/scanSlice'
import LoadingSpinner from '../components/ui/LoadingSpinner'

function buildBadges(scans) {
  const total     = scans.length
  const greenHits = scans.filter(s => (s.base_score || 0) >= 70).length
  const redCaught = scans.filter(s => s.base_score != null && (s.base_score) < 45).length

  // Consecutive-day streak
  const days = [...new Set(
    scans
      .map(s => s.created_at?.slice(0, 10))
      .filter(Boolean)
  )].sort()

  let maxStreak = 0, cur = 0
  for (let i = 0; i < days.length; i++) {
    if (i === 0) { cur = 1 }
    else {
      const prev = new Date(days[i - 1]), curr = new Date(days[i])
      const diff = (curr - prev) / 86400000
      cur = diff === 1 ? cur + 1 : 1
    }
    maxStreak = Math.max(maxStreak, cur)
  }

  return [
    // Scanner milestones
    { emoji: '🔍', name: 'First Scan',     desc: 'Scanned your first product',      unlocked: total >= 1  },
    { emoji: '🔎', name: 'Label Reader',   desc: 'Scanned 5 products',              unlocked: total >= 5  },
    { emoji: '🧪', name: 'Lab Assistant',  desc: 'Scanned 10 products',             unlocked: total >= 10 },
    { emoji: '🔬', name: 'Food Scientist', desc: 'Scanned 25 products',             unlocked: total >= 25 },
    { emoji: '🏆', name: 'Label Pro',      desc: 'Scanned 50 products',             unlocked: total >= 50 },
    // Health badges
    { emoji: '🥗', name: 'Clean Eater',    desc: 'Found your first GREEN product',  unlocked: greenHits >= 1 },
    { emoji: '🌿', name: 'Health Hero',    desc: '5 GREEN products found',          unlocked: greenHits >= 5 },
    // Detective badges
    { emoji: '🚨', name: 'Danger Spotter', desc: 'Caught your first RED product',   unlocked: redCaught >= 1 },
    { emoji: '🕵️', name: 'Food Detective', desc: 'Caught 5 harmful products',       unlocked: redCaught >= 5 },
    // Streak badges
    { emoji: '🔥', name: '3-Day Streak',   desc: 'Scanned on 3 consecutive days',   unlocked: maxStreak >= 3 },
    { emoji: '⚡', name: '7-Day Streak',   desc: 'Scanned every day for a week',    unlocked: maxStreak >= 7 },
  ]
}

export default function Achievements() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const token    = useSelector(s => s.auth.token)
  const { history: scans, loading, error } = useSelector(s => s.scan)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    dispatch(fetchHistory())
  }, [dispatch, token, navigate])

  if (loading) return <LoadingSpinner message="Loading achievements…" />
  if (error)   return <p className="text-center text-red-500 py-16">{error}</p>

  const badges   = buildBadges(scans)
  const unlocked = badges.filter(b => b.unlocked).length

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
        <ArrowLeft size={15} /> Back
      </button>

      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Award size={22} className="text-amber-500" /> Achievements
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {unlocked} of {badges.length} badges unlocked
          {scans.length > 0 && ` · based on ${scans.length} scan${scans.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Overall progress bar */}
      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5">
        <div
          className="bg-gradient-to-r from-amber-400 to-orange-500 h-2.5 rounded-full transition-all duration-700"
          style={{ width: `${(unlocked / badges.length) * 100}%` }}
        />
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {badges.map(b => (
          <div
            key={b.name}
            className={`rounded-2xl border p-4 flex flex-col items-center text-center gap-2 transition-all ${
              b.unlocked
                ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-50'
            }`}
          >
            <span className="text-3xl leading-none">
              {b.unlocked ? b.emoji : <Lock size={24} className="text-gray-400" />}
            </span>
            <div>
              <p className={`text-sm font-semibold ${b.unlocked ? 'text-amber-700 dark:text-amber-400' : 'text-gray-500 dark:text-gray-500'}`}>
                {b.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{b.desc}</p>
            </div>
            {b.unlocked && (
              <span className="text-xs text-amber-600 dark:text-amber-500 font-medium">✓ Unlocked</span>
            )}
          </div>
        ))}
      </div>

      {scans.length === 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Start scanning products to unlock badges!</p>
          <button onClick={() => navigate('/')} className="mt-2 text-green-600 hover:underline text-sm">Scan now →</button>
        </div>
      )}
    </div>
  )
}
