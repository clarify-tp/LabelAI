/**
 * src/store/slices/scanSlice.js
 * Current scan result + scan history list.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../configs/api'
import toast from 'react-hot-toast'

export const scanByBarcode = createAsyncThunk('scan/barcode', async ({ barcode, category }, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/api/scan/barcode', { barcode, category })
    return data
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data?.error || 'Scan failed'
    toast.error(msg); return rejectWithValue(msg)
  }
})

export const scanByPhoto = createAsyncThunk('scan/photo', async ({ image, category, mime_type }, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/api/scan/photo', { image, category, mime_type })
    return data
  } catch (err) {
    // Surface the structured LOW_CONFIDENCE tips payload to the caller
    const payload = err.response?.data
    const msg = payload?.error || payload?.message || 'Photo scan failed'
    if (payload?.status !== 'LOW_CONFIDENCE') toast.error(msg)
    return rejectWithValue(payload || msg)
  }
})

export const scanByLink = createAsyncThunk('scan/link', async ({ url, category }, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/api/scan/link', { url, category })
    return data
  } catch (err) {
    const msg = err.response?.data?.error || 'Link scan failed'
    toast.error(msg); return rejectWithValue(msg)
  }
})

export const fetchHistory = createAsyncThunk('scan/history', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/api/product/history')
    return data.scans
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to fetch history')
  }
})

const scanSlice = createSlice({
  name: 'scan',
  initialState: { current: null, history: [], loading: false, error: null },
  reducers: {
    clearCurrent(state) { state.current = null; state.error = null },
    clearError(state)   { state.error = null },
  },
  extraReducers: (builder) => {
    const pending   = (s) => { s.loading = true;  s.error = null }
    const fulfilled = (s, a) => { s.loading = false; s.current = a.payload }
    const rejected  = (s, a) => { s.loading = false; s.error = a.payload }
    builder
      .addCase(scanByBarcode.pending, pending).addCase(scanByBarcode.fulfilled, fulfilled).addCase(scanByBarcode.rejected, rejected)
      .addCase(scanByPhoto.pending, pending).addCase(scanByPhoto.fulfilled, fulfilled).addCase(scanByPhoto.rejected, rejected)
      .addCase(scanByLink.pending, pending).addCase(scanByLink.fulfilled, fulfilled).addCase(scanByLink.rejected, rejected)
      .addCase(fetchHistory.fulfilled, (s, a) => { s.history = a.payload || [] })
  },
})
export const { clearCurrent, clearError } = scanSlice.actions
export default scanSlice.reducer
