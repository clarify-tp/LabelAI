/**
 * src/store/slices/chatSlice.js  (FIXED)
 * ========================================
 * Fixes:
 *   1. sendChatMessage now passes `category` to the backend so the
 *      chat route can call per_100g_to_per_serving with the right
 *      default serving size (beverages = 200ml, not 100g).
 *
 *   2. productBarcode is read from the argument passed by the component,
 *      not from state — avoids stale closure issues where Redux state
 *      hadn't updated yet when the thunk ran.
 *
 *   3. Removed UUID import (wasn't available in all environments);
 *      generates session IDs inline with a simple random string.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../configs/api'

/** Generate a simple unique session ID without importing uuid */
const genSessionId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 9)

export const sendChatMessage = createAsyncThunk(
  'chat/send',
  async ({ message, productBarcode, history, category }, { rejectWithValue, getState }) => {
    try {
      const { sessionId } = getState().chat

      const { data } = await api.post('/api/chat', {
        message,
        session_id:      sessionId,
        // Pass barcode from argument (not state) to avoid stale closure
        product_barcode: productBarcode || null,
        history:         (history || []).slice(-10),
        // Pass category so serving size is correct for beverages
        category:        category || 'general',
      })

      return {
        message,
        response:        data.response,
        context_subject: data.context_subject,
      }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || 'Chat request failed'
      )
    }
  }
)

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    sessionId:    genSessionId(),
    history:      [],   // [{role: 'user'|'assistant', content: str}]
    activeBarcode: null,
    loading:      false,
    error:        null,
  },
  reducers: {
    setActiveBarcode(state, action) {
      state.activeBarcode = action.payload
    },
    clearChat(state) {
      state.history      = []
      state.sessionId    = genSessionId()
      state.activeBarcode = null
      state.error        = null
    },
    loadHistory(state, action) {
      state.history = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendChatMessage.pending, (state, action) => {
        state.loading = true
        state.error   = null
        // Optimistically add user message
        state.history.push({ role: 'user', content: action.meta.arg.message })
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.loading = false
        state.history.push({ role: 'assistant', content: action.payload.response })
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.loading = false
        state.error   = action.payload
        // Remove the optimistically added user message on failure
        if (
          state.history.length > 0 &&
          state.history[state.history.length - 1].role === 'user'
        ) {
          state.history.pop()
        }
      })
  },
})

export const { setActiveBarcode, clearChat, loadHistory } = chatSlice.actions
export default chatSlice.reducer