/**
 * src/components/layout/Breadcrumb.jsx
 * Auto-generated breadcrumb from URL path segments.
 */
import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

const LABELS = { '': 'Home', result: 'Scan Result', compare: 'Compare', chat: 'Chat', history: 'History', profile: 'Profile', login: 'Login', register: 'Register' }

export default function Breadcrumb() {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)
  const crumbs = [{ label: 'Home', to: '/' }, ...segments.map((seg, i) => ({ label: LABELS[seg] || seg, to: '/' + segments.slice(0, i + 1).join('/') }))]
  if (crumbs.length <= 1) return null
  return (
    <nav className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
      <Home size={12}/>
      {crumbs.map((c, i) => (
        <React.Fragment key={c.to}>
          {i > 0 && <ChevronRight size={11} className="text-gray-400"/>}
          {i === crumbs.length - 1
            ? <span className="text-gray-900 dark:text-gray-200 font-medium">{c.label}</span>
            : <Link to={c.to} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">{c.label}</Link>}
        </React.Fragment>
      ))}
    </nav>
  )
}
