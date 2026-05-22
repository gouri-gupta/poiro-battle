//Zustand store — holds user + token in memory and persists to localStorage so refresh works
import { create } from 'zustand'
import api from '../api/index'

// create() is Zustand's way of making a global store
// Think of this as a shared box any component can read/write
const useAuthStore = create((set) => ({

  // ── State ──────────────────────────────────────
  // Load from localStorage so login survives refresh
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  loading: false,
  error: null,

  // ── Actions ────────────────────────────────────

  // Register new user
  register: async (username, email, password) => {
    set({ loading: true, error: null })
    try {
      const res = await api.post('/auth/register', {
        username,
        email,
        password,
      })

      // Save to localStorage so it survives page refresh
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))

      // Update Zustand state
      set({
        user: res.data.user,
        token: res.data.token,
        loading: false,
      })

      return { success: true }

    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed'
      set({ error: message, loading: false })
      return { success: false, message }
    }
  },

  // Login existing user
  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const res = await api.post('/auth/login', { email, password })

      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))

      set({
        user: res.data.user,
        token: res.data.token,
        loading: false,
      })

      return { success: true }

    } catch (error) {
      const message = error.response?.data?.message || 'Login failed'
      set({ error: message, loading: false })
      return { success: false, message }
    }
  },

  // Logout — clear everything
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null, error: null })
  },

  // Clear error message
  clearError: () => set({ error: null }),
}))

export default useAuthStore