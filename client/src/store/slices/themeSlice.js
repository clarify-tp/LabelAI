/**
 * src/store/slices/themeSlice.js
 * ✅ Fixed: applies dark class on init AND on every toggle
 * Persists to localStorage as 'lp_theme'.
 */
import { createSlice } from '@reduxjs/toolkit'

function applyTheme(mode) {
  if (mode === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

// Apply on page load immediately
const stored = localStorage.getItem('lp_theme') || 'light'
applyTheme(stored)

const themeSlice = createSlice({
  name: 'theme',
  initialState: { mode: stored },
  reducers: {
    toggleTheme(state) {
      state.mode = state.mode === 'light' ? 'dark' : 'light'
      localStorage.setItem('lp_theme', state.mode)
      applyTheme(state.mode)
    },
    setTheme(state, action) {
      state.mode = action.payload
      localStorage.setItem('lp_theme', state.mode)
      applyTheme(state.mode)
    },
  },
})

export const { toggleTheme, setTheme } = themeSlice.actions
export default themeSlice.reducer
