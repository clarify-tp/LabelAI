/**
 * src/main.jsx
 * ============
 * React application entry point.
 * Wraps the app in BrowserRouter + Redux Provider.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import store from './store'
import './index.css'
import App from './App.jsx'

// ── Optional Sentry error monitoring (Task 3G) — only active if DSN set ──────
// Install with:  npm install @sentry/react
// Then set VITE_SENTRY_DSN in client/.env. Loaded dynamically so the app
// builds and runs fine even when @sentry/react isn't installed.
if (import.meta.env.VITE_SENTRY_DSN) {
  import('@sentry/react')
    .then((Sentry) => {
      Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        tracesSampleRate: 0.1,
      })
    })
    .catch(() => { /* @sentry/react not installed — skip silently */ })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <App />
      </Provider>
    </BrowserRouter>
  </StrictMode>
)
