import { create } from 'zustand'
import api from '../api/index'

const useRoomStore = create((set) => ({

  // ── State ──────────────────────────────────────
  room: null,       // full room object from DB
  loading: false,
  error: null,

  // ── Actions ────────────────────────────────────

  // Create a new room (host)
  createRoom: async (challenge) => {
    set({ loading: true, error: null })
    try {
      const res = await api.post('/rooms', { challenge })
      set({ room: res.data.room, loading: false })
      return { success: true, code: res.data.room.code }

    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create room'
      set({ error: message, loading: false })
      return { success: false, message }
    }
  },

  // Join an existing room (participant)
  joinRoom: async (code) => {
    set({ loading: true, error: null })
    try {
      const res = await api.post('/rooms/join', { code })
      set({ room: res.data.room, loading: false })
      return { success: true, code: res.data.room.code }

    } catch (error) {
      const message = error.response?.data?.message || 'Failed to join room'
      set({ error: message, loading: false })
      return { success: false, message }
    }
  },

  // Fetch room state (used on page refresh)
  fetchRoom: async (code) => {
    set({ loading: true, error: null })
    try {
      const res = await api.get(`/rooms/${code}`)
      set({ room: res.data.room, loading: false })
      return { success: true }

    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch room'
      set({ error: message, loading: false })
      return { success: false, message }
    }
  },

  // Update room state from socket events
  setRoom: (room) => set({ room }),

  // Clear room on logout or leave
  clearRoom: () => set({ room: null, error: null }),
}))

export default useRoomStore