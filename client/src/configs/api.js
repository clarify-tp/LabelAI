/**
 * src/configs/api.js
 * ==================
 * Centralised Axios instance for all Flask API calls.
 *
 * - baseURL is read from VITE_BASE_URL env var
 * - Request interceptor: attaches JWT token from localStorage
 * - Response interceptor: redirects to /login on 401
 *
 * Usage in any component/hook:
 *   import api from '@/configs/api'
 *   const { data } = await api.post('/api/scan/barcode', { barcode, category })
 */

import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  timeout: 30000,   // 30s — scraping can take a while
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: inject JWT ────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lp_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor: handle 401 globally ──────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and redirect
      localStorage.removeItem('lp_token')
      localStorage.removeItem('lp_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
