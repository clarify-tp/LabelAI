/**
 * src/store/index.js
 * ==================
 * Redux Toolkit store.
 *
 * Slices:
 *   auth      — user authentication state (user, token, profile)
 *   theme     — light/dark mode toggle (persisted to localStorage)
 *   scan      — current scan result and scan history
 *   compare   — products queued for comparison (max 4)
 *   chat      — chat session state and message history
 */

import { configureStore } from '@reduxjs/toolkit'
import authReducer    from './slices/authSlice'
import themeReducer   from './slices/themeSlice'
import scanReducer    from './slices/scanSlice'
import compareReducer from './slices/compareSlice'
import chatReducer    from './slices/chatSlice'

const store = configureStore({
  reducer: {
    auth:    authReducer,
    theme:   themeReducer,
    scan:    scanReducer,
    compare: compareReducer,
    chat:    chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serialisable values in these action paths
        ignoredActionPaths: ['payload.file'],
      },
    }),
})

export default store
