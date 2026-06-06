/**
 * src/App.jsx
 * ===========
 * Root component. Defines all application routes.
 * Loads keyboard shortcuts hook globally.
 * Fetches user profile on app load if authenticated.
 */
import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import { fetchProfile } from './store/slices/authSlice'
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts'

import Layout    from './layout/Layout'
import Home      from './pages/Home'
import Result    from './pages/Result'
import Compare   from './pages/Compare'
import Chat      from './pages/Chat'
import Profile   from './pages/Profile'
import History   from './pages/History'
import Login     from './pages/Login'
import Register  from './pages/Register'
import NotFound  from './pages/NotFound'

const ProtectedRoute = ({ children }) => {
  const token = useSelector(s => s.auth.token)
  return token ? children : <Navigate to="/login" replace />
}

const PublicRoute = ({ children }) => {
  const token = useSelector(s => s.auth.token)
  return token ? <Navigate to="/" replace /> : children
}

function AppInner() {
  const dispatch = useDispatch()
  const token    = useSelector(s => s.auth.token)

  // Register global keyboard shortcuts (needs to be inside Router context)
  useKeyboardShortcuts()

  // Fetch profile on app load
  useEffect(() => {
    if (token) dispatch(fetchProfile())
  }, [token, dispatch])

  return (
    <Routes>
      <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route element={<Layout />}>
        <Route path="/"        element={<Home />} />
        <Route path="/result"  element={<Result />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/chat"    element={<Chat />} />
        <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: '10px', fontFamily: 'inherit', fontSize: '14px' },
        }}
      />
      <AppInner />
    </>
  )
}
