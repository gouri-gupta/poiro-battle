import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import useRoomStore from '../store/roomStore'

function LobbyPage() {
  // Toggle between create and join
  const [mode, setMode] = useState('create') // 'create' | 'join'

  // Form state
  const [challenge, setChallenge] = useState('')
  const [joinCode, setJoinCode]   = useState('')

  const navigate  = useNavigate()
  const { user, logout } = useAuthStore()
  const { createRoom, joinRoom, loading, error } = useRoomStore()

  // Handle create room
  const handleCreate = async (e) => {
    e.preventDefault()
    const result = await createRoom(challenge)
    if (result.success) {
      navigate(`/room/${result.code}`)
    }
  }

  // Handle join room
  const handleJoin = async (e) => {
    e.preventDefault()
    const result = await joinRoom(joinCode.toUpperCase())
    if (result.success) {
      navigate(`/room/${result.code}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Top navbar */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-purple-400">⚔️ Poiro Battle</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">
            Hey, <span className="text-white font-medium">{user?.username}</span>
          </span>
          <button
            onClick={logout}
            className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-65px)] p-4">
        <div className="w-full max-w-md">

          <h2 className="text-3xl font-bold text-center mb-2">
            Battle Lobby
          </h2>
          <p className="text-gray-400 text-center mb-8">
            Create a new room or join an existing one
          </p>

          {/* Mode toggle */}
          <div className="flex bg-gray-900 rounded-xl p-1 mb-6">
            <button
              onClick={() => setMode('create')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                mode === 'create'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Create Room
            </button>
            <button
              onClick={() => setMode('join')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                mode === 'join'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Join Room
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Create Room Form */}
          {mode === 'create' && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Battle Challenge
                </label>
                <textarea
                  value={challenge}
                  onChange={(e) => setChallenge(e.target.value)}
                  placeholder="e.g. Create the most insane luxury cyberpunk perfume campaign for Gen-Z"
                  required
                  rows={4}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-3 transition"
              >
                {loading ? 'Creating...' : '🚀 Create Battle Room'}
              </button>
            </form>
          )}

          {/* Join Room Form */}
          {mode === 'join' && (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Room Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. XK92MF"
                  required
                  maxLength={6}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition text-center text-2xl tracking-widest font-mono uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-3 transition"
              >
                {loading ? 'Joining...' : '🎮 Join Battle Room'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}

export default LobbyPage