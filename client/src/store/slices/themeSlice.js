/**
 * src/store/slices/themeSlice.js
 * Light / dark mode. Persists to localStorage as 'lp_theme'.
 * Applies/removes 'dark' class on document.documentElement for Tailwind dark mode.
 */
import { createSlice } from '@reduxjs/toolkit'

const stored = localStorage.getItem('lp_theme') || 'light'
if (stored === 'dark') document.documentElement.classList.add('dark')

const themeSlice = createSlice({
  name: 'theme',
  initialState: { mode: stored },
  reducers: {
    toggleTheme(state) {
      state.mode = state.mode === 'light' ? 'dark' : 'light'
      localStorage.setItem('lp_theme', state.mode)
      document.documentElement.classList.toggle('dark', state.mode === 'dark')
    },
    setTheme(state, action) {
      state.mode = action.payload
      localStorage.setItem('lp_theme', state.mode)
      document.documentElement.classList.toggle('dark', state.mode === 'dark')
    },
  },
})

export const { toggleTheme, setTheme } = themeSlice.actions
export default themeSlice.reducer
