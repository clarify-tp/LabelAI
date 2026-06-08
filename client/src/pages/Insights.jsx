/**
 * src/pages/Insights.jsx
 * =======================
 * Personal health insights page.
 * Aggregates the user's scan history to surface:
 *   - Average LabelScan Score over time
 *   - Most scanned categories
 *   - Most common harmful additives in their diet
 *   - A simple RED / ORANGE / GREEN breakdown donut
 *
 * Data is loaded from GET /api/product/history (same endpoint as History page).
 * All computation is client-side — no extra API needed.
 */
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { TrendingUp, AlertTriangle, CheckCircle, BarChart2, ArrowLeft } from 'lucide-react'
import api from '../configs/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'

function StatCard({ icon, label, value, sub, color = 'green' }) {
  const colors = {
    green:  'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400',
    red:    'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400',
    blue:   'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
  }
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</span></div>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function Insights() {
  const navigate = useNavigate()
  const token    = useSelector(s => s.auth.token)
  const [scans,   setScans]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    api.get('/api/product/history')
      .then(r => setScans(r.data?.scans || r.data || []))
      .catch(() => setError('Could not load your scan history.'))
      .finally(() => setLoading(false))
  }, [token, navigate])

  if (loading) return <LoadingSpinner message="Loading your insights…" />
  if (error)   return <p className="text-center text-red-500 py-16">{error}</p>
  if (!scans.length) return (
    <div className="text-center py-16 space-y-3">
      <TrendingUp size={40} className="mx-auto text-gray-300 dark:text-gray-600" />
      <p className="text-gray-500 dark:text-gray-400 text-sm">No scans yet — start scanning to see insights.</p>
      <button onClick={() => navigate('/')} className="text-green-600 hover:underline text-sm">Scan your first product →</button>
    </div>
  )

  // ── Derived stats ──────────────────────────────────────────────────────────
  const scores   = scans.map(s => s.base_score).filter(Boolean)
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  const green  = scans.filter(s => (s.base_score || 0) >= 70).length
  const orange = scans.filter(s => (s.base_score || 0) >= 45 && (s.base_score || 0) < 70).length
  const red    = scans.filter(s => (s.base_score || 0) < 45 && s.base_score != null).length

  const catCount = {}
  scans.forEach(s => { if (s.category) catCount[s.category] = (catCount[s.category] || 0) + 1 })
  const topCats = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const bandColor = avgScore >= 70 ? 'green' : avgScore >= 45 ? 'orange' : 'red'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
        <ArrowLeft size={15} /> Back
      </button>

      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <TrendingUp size={22} className="text-emerald-500" /> My Insights
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Based on your last {scans.length} scan{scans.length !== 1 ? 's' : ''}.</p>
      </div>

      {/* Score summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<BarChart2 size={16}/>} label="Avg Score" value={`${avgScore}/100`} sub="across all scans" color={bandColor} />
        <StatCard icon={<CheckCircle size={16}/>} label="Safe" value={green} sub="score ≥ 70" color="green" />
        <StatCard icon={<AlertTriangle size={16}/>} label="Caution" value={orange} sub="score 45–69" color="orange" />
        <StatCard icon={<AlertTriangle size={16}/>} label="Avoid" value={red} sub="score < 45" color="red" />
      </div>

      {/* Score band bar */}
      {scans.length > 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Score Band Breakdown</h3>
          {[
            { label: '🟢 Safe (70–100)', count: green,  color: 'bg-green-500' },
            { label: '🟡 Caution (45–69)', count: orange, color: 'bg-orange-400' },
            { label: '🔴 Avoid (0–44)',  count: red,    color: 'bg-red-500' },
          ].map(b => (
            <div key={b.label}>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>{b.label}</span><span>{b.count}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                <div
                  className={`${b.color} h-2 rounded-full transition-all duration-700`}
                  style={{ width: scans.length ? `${(b.count / scans.length) * 100}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top categories */}
      {topCats.length > 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Most Scanned Categories</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {topCats.map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{cat.replace(/_/g, ' ')}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{count} scan{count !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-center text-gray-400 dark:text-gray-600">
        Insights update automatically as you scan more products.
      </p>
    </div>
  )
}
