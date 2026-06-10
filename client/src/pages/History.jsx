/**
 * src/pages/History.jsx
 * ─────────────────────
 * • Card view  : product image + score circle + frequency badge per card
 * • List view  : compact rows (existing style)
 * • Click card/row → navigates to /result with that scan's data
 * • Delete button per card/row
 * • Filter by score band
 * • Export CSV / Excel / PDF
 */
import React, { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  Download, BarChart2, ImageOff, LayoutGrid, List,
  Trash2, Calendar, ChevronRight,
} from 'lucide-react'
import { fetchHistory, deleteScan, setCurrentFromHistory } from '../store/slices/scanSlice'
import api from '../configs/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

/* ── helpers ──────────────────────────────────────────────── */
function scoreBand(sc) {
  if (!sc) return 'unknown'
  if (sc >= 70) return 'safe'
  if (sc >= 45) return 'caution'
  return 'avoid'
}

function ScoreBadge({ score }) {
  if (!score) return <span className="text-xs text-gray-400">—</span>
  const cls =
    score >= 70 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    : score >= 45 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{score}/100</span>
}

function FreqPill({ freq }) {
  if (!freq) return null
  const col =
    freq.color === 'GREEN'  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
    : freq.color === 'RED'  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
    : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${col}`}>
      <Calendar size={9} /> {freq.emoji} {freq.label}
    </span>
  )
}

const FILTERS = [
  { id: 'all',     label: 'All' },
  { id: 'safe',    label: '🟢 Safe' },
  { id: 'caution', label: '🟡 Caution' },
  { id: 'avoid',   label: '🔴 Avoid' },
]

/* ── card component ───────────────────────────────────────── */
function HistoryCard({ scan, onOpen, onDelete }) {
  const band = scoreBand(scan.base_score)
  const ringColor =
    band === 'safe'    ? 'ring-green-400'
    : band === 'caution' ? 'ring-orange-400'
    : band === 'avoid'   ? 'ring-red-400'
    : 'ring-gray-300'

  return (
    <div
      onClick={() => onOpen(scan)}
      className="relative group rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Delete button */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(scan) }}
        className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
        title="Delete"
      >
        <Trash2 size={13} />
      </button>

      {/* Product image */}
      <div className="relative h-36 bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
        {scan.scan_image_url ? (
          <img
            src={scan.scan_image_url}
            alt={scan.product_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageOff size={28} className="text-gray-300 dark:text-gray-600" />
        )}
        {/* Score badge overlay */}
        <div className="absolute bottom-2 right-2">
          <div className={`w-10 h-10 rounded-full bg-white dark:bg-gray-900 ring-2 ${ringColor} flex items-center justify-center shadow`}>
            <span className={`text-xs font-bold ${
              band === 'safe' ? 'text-green-600' : band === 'caution' ? 'text-orange-500' : 'text-red-600'
            }`}>{scan.base_score || '?'}</span>
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="p-3 space-y-1.5">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug">
          {scan.product_name || 'Unknown product'}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">
          {scan.category?.replace(/_/g, ' ')} · {scan.input_method}
        </p>
        {scan.created_at && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {format(new Date(scan.created_at), 'MMM d, yyyy')}
          </p>
        )}
        <FreqPill freq={scan.consumption_frequency} />
      </div>

      {/* Open arrow */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight size={14} className="text-gray-400" />
      </div>
    </div>
  )
}

/* ── list row ─────────────────────────────────────────────── */
function HistoryRow({ scan, onOpen, onDelete }) {
  return (
    <div
      onClick={() => onOpen(scan)}
      className="group flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
    >
      {scan.scan_image_url ? (
        <img src={scan.scan_image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 text-gray-300 dark:text-gray-600">
          <ImageOff size={16} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {scan.product_name || 'Unknown product'}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {scan.category} · {scan.input_method}
            {scan.created_at && ` · ${format(new Date(scan.created_at), 'MMM d, yyyy')}`}
          </p>
          <FreqPill freq={scan.consumption_frequency} />
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <ScoreBadge score={scan.base_score} />
        <button
          onClick={e => { e.stopPropagation(); onDelete(scan) }}
          className="p-1.5 rounded-full text-gray-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
        <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
      </div>
    </div>
  )
}

/* ── main page ────────────────────────────────────────────── */
export default function History() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { history, loading } = useSelector(s => s.scan)

  const [filter,   setFilter]   = useState('all')
  const [viewMode, setViewMode] = useState('card')   // 'card' | 'list'
  const [deleting, setDeleting] = useState(null)     // scan id being confirmed

  useEffect(() => { dispatch(fetchHistory()) }, [dispatch])

  const filtered = useMemo(() => {
    return (history || []).filter(s => {
      const sc = s.base_score || 0
      if (filter === 'safe')    return sc >= 70
      if (filter === 'caution') return sc >= 45 && sc < 70
      if (filter === 'avoid')   return sc > 0 && sc < 45
      return true
    })
  }, [history, filter])

  const handleOpen = (scan) => {
    dispatch(setCurrentFromHistory(scan))
    navigate('/result')
  }

  const handleDelete = (scan) => {
    setDeleting(scan.id)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    await dispatch(deleteScan(deleting))
    toast.success('Scan deleted')
    setDeleting(null)
  }

  const handleExport = async (fmt) => {
    try {
      const resp = await api.get(`/api/export/${fmt}`, { responseType: 'blob' })
      const url  = URL.createObjectURL(resp.data)
      const a    = document.createElement('a')
      a.href = url; a.download = `scans.${fmt === 'excel' ? 'xlsx' : fmt}`; a.click()
      URL.revokeObjectURL(url)
      toast.success(`Downloaded as ${fmt.toUpperCase()}`)
    } catch { toast.error('Export failed') }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* ── header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <BarChart2 size={22} className="text-green-500" /> Scan History
          {history.length > 0 && (
            <span className="text-sm font-normal text-gray-400 dark:text-gray-500">({history.length} scans)</span>
          )}
        </h1>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 transition-colors ${viewMode === 'card' ? 'bg-green-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              title="Card view"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-green-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              title="List view"
            >
              <List size={15} />
            </button>
          </div>

          {/* Exports */}
          {['csv', 'excel', 'pdf'].map(f => (
            <button key={f} onClick={() => handleExport(f)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Download size={12} /> {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── filter pills ── */}
      {history.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                filter === f.id
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* ── content ── */}
      {loading ? (
        <div className="text-center py-8 text-sm text-gray-400">Loading…</div>
      ) : history.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <BarChart2 size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No scans yet. Start scanning products!</p>
          <button onClick={() => navigate('/')} className="mt-3 text-sm text-green-600 dark:text-green-400 hover:underline">
            Scan now →
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">No scans in this band.</div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map(scan => (
            <HistoryCard key={scan.id} scan={scan} onOpen={handleOpen} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map(scan => (
              <HistoryRow key={scan.id} scan={scan} onOpen={handleOpen} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* ── delete confirmation modal ── */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 size={22} className="text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Delete scan?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">This scan record will be permanently removed.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleting(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
