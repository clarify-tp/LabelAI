/**
 * src/pages/History.jsx
 * ======================
 * User scan history with export buttons (CSV, Excel, PDF).
 */
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Download, BarChart2 } from 'lucide-react'
import { fetchHistory } from '../store/slices/scanSlice'
import api from '../configs/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

function ScoreBadge({ score }) {
  if (!score) return <span className="text-xs text-gray-400">—</span>
  const cls = score >= 70 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            : score >= 45 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{score}/100</span>
}

export default function History() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { history, loading } = useSelector(s => s.scan)

  useEffect(() => { dispatch(fetchHistory()) }, [dispatch])

  const handleExport = async (format) => {
    try {
      const resp = await api.get(`/api/export/${format}`, { responseType: 'blob' })
      const url  = URL.createObjectURL(resp.data)
      const a    = document.createElement('a')
      a.href = url; a.download = `scans.${format === 'excel' ? 'xlsx' : format}`; a.click()
      URL.revokeObjectURL(url)
      toast.success(`Downloaded as ${format.toUpperCase()}`)
    } catch { toast.error(`Export failed`) }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <BarChart2 size={22} className="text-green-500"/> Scan History
        </h1>
        <div className="flex items-center gap-2">
          {['csv','excel','pdf'].map(f => (
            <button key={f} onClick={() => handleExport(f)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Download size={12}/> {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-sm text-gray-400">Loading...</div>
      ) : history.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <BarChart2 size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3"/>
          <p className="text-sm text-gray-500 dark:text-gray-400">No scans yet. Start scanning products!</p>
          <button onClick={() => navigate('/')} className="mt-3 text-sm text-green-600 dark:text-green-400 hover:underline">Scan now →</button>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {history.map((scan) => (
              <div key={scan.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{scan.product_name || 'Unknown product'}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {scan.category} · {scan.input_method} ·{' '}
                    {scan.created_at ? format(new Date(scan.created_at), 'MMM d, yyyy') : ''}
                  </p>
                </div>
                <ScoreBadge score={scan.base_score} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
