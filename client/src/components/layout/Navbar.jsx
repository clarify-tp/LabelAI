/**
 * src/components/layout/Navbar.jsx
 * ✅ Dark/light mode toggle — fixed (was dispatching but DOM class not applied)
 * ✅ Language switcher (EN / Gujlish)
 */
import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  ChefHat, ScanLine, GitCompare, MessageCircle, History,
  Sun, Moon, User, LogOut, ChevronDown, Keyboard,
  Sparkles, TrendingUp, Award, Languages,
} from 'lucide-react'
import { toggleTheme } from '../../store/slices/themeSlice'
import { logout } from '../../store/slices/authSlice'
import { useLang, LANGS, t } from '../../App'
import toast from 'react-hot-toast'

export default function Navbar({ onShowShortcuts }) {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const location  = useLocation()
  const theme     = useSelector(s => s.theme.mode)
  const user      = useSelector(s => s.auth.user)
  const compareQ  = useSelector(s => s.compare.queue)
  const { lang, setLang } = useLang()

  const [userMenu,   setUserMenu]   = useState(false)
  const [langMenu,   setLangMenu]   = useState(false)
  const [scrolled,   setScrolled]   = useState(false)
  const userMenuRef = useRef(null)
  const langMenuRef = useRef(null)

  /* scroll shadow */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  /* close dropdowns on outside click */
  useEffect(() => {
    const fn = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenu(false)
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) setLangMenu(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  /* ensure dark class is in sync (fixes toggle on first render) */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
    toast.success('Logged out successfully', { icon: '👋' })
  }

  const navItems = [
    { to: '/',        icon: <ScanLine size={16} />,     label: t(lang, 'home'),    gradient: 'from-green-500 to-emerald-500' },
    { to: '/compare', icon: <GitCompare size={16} />,   label: t(lang, 'compare'), badge: compareQ.length, gradient: 'from-blue-500 to-cyan-500' },
    { to: '/chat',    icon: <MessageCircle size={16} />, label: t(lang, 'chat'),   gradient: 'from-purple-500 to-pink-500' },
    { to: '/history', icon: <History size={16} />,      label: t(lang, 'history'), gradient: 'from-orange-500 to-amber-500' },
  ]

  const isActive = (to) => to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-lg'
        : 'bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-400 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <ChefHat size={28} className="relative text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform duration-300" />
              <Sparkles size={12} className="absolute -top-1 -right-1 text-yellow-500 animate-pulse" />
            </div>
            <div>
              <span
                style={{ fontFamily: "'Playwrite GB J', cursive" }}
                className="font-bold text-lg bg-gradient-to-r from-orange-600 via-amber-600 to-emerald-600 dark:from-orange-400 dark:via-amber-400 dark:to-emerald-400 bg-clip-text text-transparent"
              >
                Label AI
              </span>
              <span className="hidden md:inline-block ml-2 text-xs bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                100% Free · No Ads
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={`relative group px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                  isActive(item.to) ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
              >
                <div className={`absolute inset-0 rounded-lg bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                <div className={`relative flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  isActive(item.to)
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100'
                }`}>
                  {item.icon}
                  {item.label}
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-bounce">
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5">

            {/* Keyboard shortcuts */}
            <button
              onClick={onShowShortcuts}
              title="Keyboard shortcuts (?)"
              className="hidden sm:flex p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all duration-200"
            >
              <Keyboard size={18} />
            </button>

            {/* Language switcher */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setLangMenu(v => !v)}
                title="Language"
                className="flex items-center gap-1 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all duration-200"
              >
                <Languages size={18} />
                <span className="text-xs font-medium hidden sm:block">{lang.toUpperCase()}</span>
              </button>
              {langMenu && (
                <div className="absolute right-0 top-full mt-2 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 z-50">
                  {Object.entries(LANGS).map(([code, name]) => (
                    <button
                      key={code}
                      onClick={() => { setLang(code); setLangMenu(false); toast.success(`Language: ${name}`) }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        lang === code
                          ? 'text-green-700 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {name} {lang === code && '✓'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dark/light toggle — FIXED */}
            <button
              onClick={() => dispatch(toggleTheme())}
              title={theme === 'dark' ? t(lang, 'light_mode') : t(lang, 'dark_mode')}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all duration-200"
            >
              {theme === 'dark'
                ? <Sun size={18} className="text-amber-400" />
                : <Moon size={18} />
              }
            </button>

            {/* User menu */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenu(v => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-400 text-sm font-medium hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 transition-all duration-200"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                    {user.first_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:block">{user.first_name || user.email?.split('@')[0]}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${userMenu ? 'rotate-180' : ''}`} />
                </button>

                {userMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 mb-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Signed in as</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user.email}</p>
                    </div>
                    <Link to="/profile" onClick={() => setUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                      <User size={16} className="text-orange-500" /> {t(lang, 'profile')}
                    </Link>
                    <Link to="/insights" onClick={() => setUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                      <TrendingUp size={16} className="text-emerald-500" /> {t(lang, 'insights')}
                    </Link>
                    <Link to="/achievements" onClick={() => setUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                      <Award size={16} className="text-amber-500" /> {t(lang, 'achievements')}
                    </Link>
                    <div className="border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
                      <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left transition-colors">
                        <LogOut size={16} /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
              >
                {t(lang, 'login')}
              </Link>
            )}
          </div>
        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg z-50">
          <div className="flex justify-around items-center py-2">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-all ${
                  isActive(item.to) ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <div className="relative">
                  {item.icon}
                  {item.badge > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[16px] h-[16px] bg-gradient-to-r from-red-500 to-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
