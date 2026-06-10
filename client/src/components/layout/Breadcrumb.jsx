/**
 * src/components/layout/Breadcrumb.jsx
 * ✅ Theme-aware (orange accent, dark mode)
 * ✅ Language-aware labels
 * ✅ Food emoji per route
 */
import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { useLang, t } from '../../App'

const ROUTE_META = {
  '':            { key: 'home',         emoji: '🏠' },
  result:        { key: 'result',       emoji: '📊' },
  compare:       { key: 'compare',      emoji: '⚖️' },
  chat:          { key: 'chat',         emoji: '💬' },
  history:       { key: 'history',      emoji: '📋' },
  profile:       { key: 'profile',      emoji: '👤' },
  login:         { key: 'login',        emoji: '🔑' },
  register:      { key: 'register',     emoji: '✏️' },
  insights:      { key: 'insights',     emoji: '📈' },
  achievements:  { key: 'achievements', emoji: '🏆' },
}

export default function Breadcrumb() {
  const { pathname }    = useLocation()
  const { lang }        = useLang()
  const segments        = pathname.split('/').filter(Boolean)

  const crumbs = [
    { label: t(lang, 'home'), emoji: '🏠', to: '/' },
    ...segments.map((seg, i) => {
      const meta = ROUTE_META[seg] || { key: seg, emoji: '📄' }
      return {
        label: t(lang, meta.key) || seg,
        emoji: meta.emoji,
        to: '/' + segments.slice(0, i + 1).join('/'),
      }
    }),
  ]

  if (crumbs.length <= 1) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 flex-wrap"
    >
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <React.Fragment key={c.to}>
            {i > 0 && (
              <ChevronRight
                size={12}
                className="text-gray-300 dark:text-gray-600 flex-shrink-0"
              />
            )}
            {i === 0 && (
              <Home size={12} className="text-orange-400 dark:text-orange-500 flex-shrink-0 mr-0.5" />
            )}
            {isLast ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
                <span>{c.emoji}</span>
                {c.label}
              </span>
            ) : (
              <Link
                to={c.to}
                className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-150"
              >
                <span>{c.emoji}</span>
                {c.label}
              </Link>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
