/**
 * src/store/slices/scanSlice.js
 * Current scan result + scan history list.
 * Added: setCurrentFromHistory, deleteFromHistory
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
    const { data } = await api.get('/api/product/history?limit=100')
    return Array.isArray(data) ? data : (data.scans || [])
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to fetch history')
  }
})

export const deleteScan = createAsyncThunk('scan/delete', async (scanId, { rejectWithValue }) => {
  try {
    await api.delete(`/api/product/history/${scanId}`)
    return scanId
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Delete failed')
  }
})

const scanSlice = createSlice({
  name: 'scan',
  initialState: { current: null, history: [], loading: false, error: null },
  reducers: {
    clearCurrent(state) { state.current = null; state.error = null },
    clearError(state)   { state.error = null },
    // Load a history item as current result so Result page can render it
    setCurrentFromHistory(state, action) {
      const scan = action.payload
      // Build a result-compatible object from a scan history row
      state.current = {
        score:      scan.base_score || 0,
        score_band: scan.base_score >= 70 ? 'GREEN' : scan.base_score >= 45 ? 'ORANGE' : 'RED',
        verdict_text: scan.verdict_text || '',
        product: {
          product_name: scan.product_name,
          barcode:      scan.barcode,
          category:     scan.category,
        },
        scan_image_url:       scan.scan_image_url || null,
        reasons_to_eat:       scan.reasons_to_eat   || [],
        reasons_to_avoid:     scan.reasons_to_avoid || [],
        side_effects:         scan.side_effects     || [],
        consumption_frequency: scan.consumption_frequency || null,
        matched_ingredients:  scan.matched_ingredients || [],
        nutrition:            scan.nutrition || null,
        _from_history: true,
      }
    },
  },
  extraReducers: (builder) => {
    const pending   = (s) => { s.loading = true;  s.error = null }
    const fulfilled = (s, a) => { s.loading = false; s.current = a.payload }
    const rejected  = (s, a) => { s.loading = false; s.error = a.payload }
    builder
      .addCase(scanByBarcode.pending, pending).addCase(scanByBarcode.fulfilled, fulfilled).addCase(scanByBarcode.rejected, rejected)
      .addCase(scanByPhoto.pending, pending).addCase(scanByPhoto.fulfilled, fulfilled).addCase(scanByPhoto.rejected, rejected)
      .addCase(scanByLink.pending, pending).addCase(scanByLink.fulfilled, fulfilled).addCase(scanByLink.rejected, rejected)
      .addCase(fetchHistory.pending,   (s) => { s.loading = true; s.error = null })
      .addCase(fetchHistory.fulfilled, (s, a) => { s.loading = false; s.history = a.payload || [] })
      .addCase(fetchHistory.rejected,  (s, a) => { s.loading = false; s.error = a.payload })
      .addCase(deleteScan.fulfilled, (s, a) => { s.history = s.history.filter(h => h.id !== a.payload) })
      .addCase(deleteScan.rejected,  (s, a) => { toast.error(a.payload) })
  },
})
export const { clearCurrent, clearError, setCurrentFromHistory } = scanSlice.actions
export default scanSlice.reducer
