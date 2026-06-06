/**
 * src/store/slices/compareSlice.js
 * Products queued for comparison (max 4). Comparison result from API.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../configs/api'
import toast from 'react-hot-toast'

export const runComparison = createAsyncThunk('compare/run', async (barcodes, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/api/compare', { barcodes })
    return data
  } catch (err) {
    toast.error(err.response?.data?.error || 'Comparison failed')
    return rejectWithValue(err.response?.data?.error)
  }
})

const compareSlice = createSlice({
  name: 'compare',
  initialState: { queue: [], compareResult: null, loading: false, error: null },
  reducers: {
    addToCompare(state, action) {
      if (state.queue.find(p => p.barcode === action.payload.barcode)) { toast('Already added'); return }
      if (state.queue.length >= 4) { toast.error('Max 4 products'); return }
      state.queue.push(action.payload)
      toast.success('Added to compare tray')
    },
    removeFromCompare(state, action) { state.queue = state.queue.filter(p => p.barcode !== action.payload) },
    clearCompare(state) { state.queue = []; state.compareResult = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runComparison.pending,   (s) => { s.loading = true; s.error = null })
      .addCase(runComparison.fulfilled, (s, a) => { s.loading = false; s.compareResult = a.payload })
      .addCase(runComparison.rejected,  (s, a) => { s.loading = false; s.error = a.payload })
  },
})
export const { addToCompare, removeFromCompare, clearCompare } = compareSlice.actions
export default compareSlice.reducer
