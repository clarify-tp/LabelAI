/**
 * src/App.jsx
 * Root component. Defines all routes.
 * ✅ ScrollToTop on every route change
 * ✅ Language context (English / Gujlish)
 */
import React, { useEffect, createContext, useContext, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import { fetchProfile } from './store/slices/authSlice'
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts'

import Layout       from './layout/Layout'
import Home         from './pages/Home'
import Result       from './pages/Result'
import Compare      from './pages/Compare'
import Chat         from './pages/Chat'
import Profile      from './pages/Profile'
import History      from './pages/History'
import Login        from './pages/Login'
import Register     from './pages/Register'
import NotFound     from './pages/NotFound'
import Insights     from './pages/Insights'
import Achievements from './pages/Achievements'

/* ─── Language context ───────────────────────────────────────────────────── */
export const LANGS = {
  en: 'English',
  gl: 'Gujlish',
}

export const LangContext = createContext({ lang: 'en', setLang: () => {} })
export const useLang = () => useContext(LangContext)

/**
 * Tiny translation helper.
 * Usage: t(lang, 'scan_now')
 * Falls back to English if key not found in selected language.
 */
export const TRANSLATIONS = {
  en: {
    scan_now:        'Scan now →',
    history:         'History',
    insights:        'My Insights',
    achievements:    'Achievements',
    share_card:      'Share verdict card',
    delete:          'Delete',
    cancel:          'Cancel',
    loading:         'Loading…',
    no_scans:        'No scans yet. Start scanning products!',
    score:           'Score',
    safe:            'Safe',
    caution:         'Caution',
    avoid:           'Avoid',
    all:             'All',
    card_view:       'Card view',
    list_view:       'List view',
    delete_confirm:  'Delete scan?',
    delete_body:     'This scan record will be permanently removed.',
    dark_mode:       'Dark mode',
    light_mode:      'Light mode',
    home:            'Home',
    result:          'Scan Result',
    compare:         'Compare',
    chat:            'Chat',
    profile:         'Profile',
    login:           'Login',
    register:        'Register',
    how_often:       'How often:',
    reasons_eat:     'Reasons to eat',
    reasons_avoid:   'Reasons to avoid',
    side_effects:    'Confirmed Side Effects',
  },
  gl: {
    scan_now:        'Scan karo →',
    history:         'Itihas',
    insights:        'Mara Insights',
    achievements:    'Uplabdhio',
    share_card:      'Verdict card share karo',
    delete:          'Delete karo',
    cancel:          'Radu do',
    loading:         'Load thay chhe…',
    no_scans:        'Koi scan nathi. Products scan karo!',
    score:           'Score',
    safe:            'Saaru chhe',
    caution:         'Saavadhaan',
    avoid:           'Na khavo',
    all:             'Badhu',
    card_view:       'Card view',
    list_view:       'List view',
    delete_confirm:  'Scan delete karvu?',
    delete_body:     'Aa scan record hamesha mate remove thase.',
    dark_mode:       'Dark mode',
    light_mode:      'Light mode',
    home:            'Home',
    result:          'Scan Result',
    compare:         'Compare',
    chat:            'Chat',
    profile:         'Profile',
    login:           'Login',
    register:        'Register',
    how_often:       'Ketli vaar:',
    reasons_eat:     'Khava na karan',
    reasons_avoid:   'Na khava na karan',
    side_effects:    'Confirmed Side Effects',
  },
}

export function t(lang, key) {
  return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key
}

/* ─── Scroll-to-top on route change ──────────────────────────────────────── */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

/* ─── Route guards ───────────────────────────────────────────────────────── */
const ProtectedRoute = ({ children }) => {
  const token = useSelector(s => s.auth.token)
  return token ? children : <Navigate to="/login" replace />
}
const PublicRoute = ({ children }) => {
  const token = useSelector(s => s.auth.token)
  return token ? <Navigate to="/" replace /> : children
}

/* ─── Inner app (needs Router context) ──────────────────────────────────── */
function AppInner() {
  const dispatch = useDispatch()
  const token    = useSelector(s => s.auth.token)

  useKeyboardShortcuts()

  useEffect(() => {
    if (token) dispatch(fetchProfile())
  }, [token, dispatch])

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route element={<Layout />}>
          <Route path="/"            element={<Home />} />
          <Route path="/result"      element={<Result />} />
          <Route path="/compare"     element={<Compare />} />
          <Route path="/chat"        element={<Chat />} />
          <Route path="/history"     element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/profile"     element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/insights"    element={<ProtectedRoute><Insights /></ProtectedRoute>} />
          <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('lp_lang') || 'en')

  const handleSetLang = (l) => {
    setLang(l)
    localStorage.setItem('lp_lang', l)
  }

  return (
    <LangContext.Provider value={{ lang, setLang: handleSetLang }}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: '10px', fontFamily: 'inherit', fontSize: '14px' },
        }}
      />
      <AppInner />
    </LangContext.Provider>
  )
}
