/**
 * src/store/slices/authSlice.js
 * Auth state: user, token, profile, loading.
 * Token persisted to localStorage for session continuity.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../configs/api'
import toast from 'react-hot-toast'

const storedToken = localStorage.getItem('lp_token')
const storedUser  = localStorage.getItem('lp_user')

export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/api/auth/login', credentials)
    localStorage.setItem('lp_token', data.token)
    localStorage.setItem('lp_user', JSON.stringify(data.user))
    return data
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Login failed')
  }
})

export const registerUser = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/api/auth/register', userData)
    localStorage.setItem('lp_token', data.token)
    localStorage.setItem('lp_user', JSON.stringify(data.user))
    return data
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Registration failed')
  }
})

export const fetchProfile = createAsyncThunk('auth/fetchProfile', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/api/profile')
    return data
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to fetch profile')
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user:    storedUser ? JSON.parse(storedUser) : null,
    token:   storedToken || null,
    profile: null,
    loading: false,
    error:   null,
  },
  reducers: {
    logout(state) {
      state.user = null; state.token = null; state.profile = null
      localStorage.removeItem('lp_token'); localStorage.removeItem('lp_user')
    },
    clearError(state) { state.error = null },
    setProfile(state, action) { state.profile = action.payload },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending,   (s) => { s.loading = true;  s.error = null })
      .addCase(loginUser.fulfilled, (s, a) => {
        s.loading = false; s.user = a.payload.user
        s.token = a.payload.token; s.profile = a.payload.profile
        toast.success('Welcome back!')
      })
      .addCase(loginUser.rejected,  (s, a) => { s.loading = false; s.error = a.payload; toast.error(a.payload) })
      .addCase(registerUser.pending,   (s) => { s.loading = true; s.error = null })
      .addCase(registerUser.fulfilled, (s, a) => {
        s.loading = false; s.user = a.payload.user; s.token = a.payload.token
        toast.success('Account created! Welcome to Label Padhega AI')
      })
      .addCase(registerUser.rejected,  (s, a) => { s.loading = false; s.error = a.payload; toast.error(a.payload) })
      .addCase(fetchProfile.fulfilled, (s, a) => { s.profile = a.payload })
  },
})

export const { logout, clearError, setProfile } = authSlice.actions
export default authSlice.reducer
