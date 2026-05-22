import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import useRoomStore from '../store/roomStore'
import useSocket from '../hooks/useSocket'
import api from '../api/index'

function RoomPage() {
  const { code } = useParams()
  const navigate  = useNavigate()

  const { user, token }            = useAuthStore()
  const { room, fetchRoom, loading } = useRoomStore()
  const { emit }                   = useSocket(code, token)

  const [prompt, setPrompt]           = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitted, setSubmitted]     = useState(false)

  // Track which submission is being scored by host
  const [scoringId, setScoringId]     = useState(null)
  const [scoreInput, setScoreInput]   = useState('')
  const [scoreLoading, setScoreLoading] = useState(false)
  const [completing, setCompleting]   = useState(false)

  useEffect(() => {
    const loadRoom = async () => {
      const result = await fetchRoom(code)
      if (!result.success) navigate('/lobby')
    }
    loadRoom()
  }, [code])

  useEffect(() => {
    if (!room || !user) return
    const already = room.round.submissions.some(
      (s) => s.participantId === user.id ||
             s.participantId?.toString() === user.id
    )
    if (already) setSubmitted(true)
  }, [room, user])

  const isHost = room?.hostId === user?.id ||
    room?.hostId?.toString() === user?.id

  const handleStartRound = () => {
    emit('start_round', { roomCode: code, token })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.post(`/rooms/${code}/submit`, { prompt })
      setSubmitted(true)
      setPrompt('')
    } catch (error) {
      setSubmitError(error.response?.data?.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Host submits a score for a specific submission
  const handleScore = async (participantId) => {
    const parsed = parseInt(scoreInput)
    if (isNaN(parsed) || parsed < 1 || parsed > 10) {
      alert('Enter a score between 1 and 10')
      return
    }
    setScoreLoading(true)
    try {
      await api.post(`/rooms/${code}/score`, {
        participantId,
        score: parsed,
      })
      setScoringId(null)
      setScoreInput('')
    } catch (error) {
      alert(error.response?.data?.message || 'Scoring failed')
    } finally {
      setScoreLoading(false)
    }
  }

  // Host ends the round
  const handleComplete = async () => {
    setCompleting(true)
    try {
      await api.post(`/rooms/${code}/complete`)
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to end round')
    } finally {
      setCompleting(false)
    }
  }

  if (loading || !room) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">
          Loading battle room...
        </div>
      </div>
    )
  }

  // Sort participants by score descending for leaderboard
  const sortedParticipants = [...room.participants].sort(
    (a, b) => b.score - a.score
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Navbar */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-purple-400">⚔️ Poiro Battle</h1>
          <span className="flex items-center gap-1.5 text-xs text-green-400">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">
            {user?.username}
            {isHost && (
              <span className="ml-2 bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full">
                HOST
              </span>
            )}
          </span>
          <button
            onClick={() => navigate('/lobby')}
            className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition"
          >
            Leave
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* Challenge card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Battle Challenge</p>
              <h2 className="text-xl font-bold text-white leading-snug">
                {room.challenge}
              </h2>
              <p className="text-gray-500 text-sm mt-2">
                Host: <span className="text-gray-300">{room.hostUsername}</span>
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl px-5 py-3 text-center">
              <p className="text-gray-400 text-xs mb-1">Room Code</p>
              <p className="text-2xl font-mono font-bold tracking-widest text-purple-400">
                {room.code}
              </p>
            </div>
          </div>
        </div>

        {/* Round controls */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Round Status</p>
              <RoundStatusBadge status={room.round.status} />
            </div>

            {isHost && room.round.status === 'idle' && (
              <button
                onClick={handleStartRound}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition"
              >
                ▶ Start Round
              </button>
            )}

            {/* Host sees End Round when round is active */}
            {isHost && room.round.status === 'active' && (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition"
              >
                {completing ? 'Ending...' : '🏁 End Round & Score'}
              </button>
            )}

            {!isHost && room.round.status === 'idle' && (
              <p className="text-gray-400 text-sm">
                Waiting for host to start...
              </p>
            )}

            {room.round.status === 'active' && !isHost && (
              <p className="text-green-400 text-sm font-medium animate-pulse">
                🔥 Round is live!
              </p>
            )}

            {room.round.status === 'complete' && (
              <p className="text-blue-400 text-sm font-medium">
                🏆 Battle complete! Check the leaderboard below.
              </p>
            )}
          </div>
        </div>

        {/* Submit form — participants only */}
        {!isHost && room.round.status === 'active' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Your Submission</h3>
            {submitted ? (
              <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 text-green-400 text-sm">
                ✅ Submitted! Watch your AI output appear below...
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {submitError && (
                  <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-lg p-3 text-sm">
                    {submitError}
                  </div>
                )}
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your creative concept..."
                  required
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition resize-none"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-3 transition"
                >
                  {submitting ? 'Submitting...' : '🚀 Submit Entry'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Submissions with scoring */}
        {room.round.status !== 'idle' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-gray-400 text-sm mb-4">
              Submissions ({room.round.submissions.length})
            </h3>
            {room.round.submissions.length === 0 ? (
              <p className="text-gray-600 text-sm">No submissions yet...</p>
            ) : (
              <div className="space-y-4">
                {room.round.submissions.map((sub) => (
                  <div
                    key={sub._id}
                    className="bg-gray-800 rounded-xl p-5 space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-purple-400 font-semibold">
                        {sub.username}
                      </span>
                      <JobStatusBadge output={sub.output} jobId={sub.jobId} />
                    </div>

                    {/* Prompt */}
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Prompt</p>
                      <p className="text-gray-300 text-sm">{sub.prompt}</p>
                    </div>

                    {/* AI Output */}
                    {sub.output ? (
                      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                        <p className="text-gray-400 text-xs mb-2">
                          ✨ AI Generated Output
                        </p>
                        <p className="text-white text-sm leading-relaxed whitespace-pre-line">
                          {sub.output}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                        <p className="text-gray-500 text-sm animate-pulse">
                          ⏳ AI is generating...
                        </p>
                      </div>
                    )}

                    {/* Score display */}
                    {sub.score !== null && sub.score !== undefined && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-2xl font-bold text-yellow-400">
                          {sub.score}
                        </span>
                        <span className="text-gray-500 text-sm">/ 10</span>
                      </div>
                    )}

                    {/* Scoring UI — host only, when round is complete */}
                    {isHost &&
                      room.round.status === 'complete' &&
                      sub.output &&
                      (sub.score === null || sub.score === undefined) && (
                      <div className="pt-2 border-t border-gray-700">
                        {scoringId === sub._id ? (
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={scoreInput}
                              onChange={(e) => setScoreInput(e.target.value)}
                              placeholder="1-10"
                              className="w-24 bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-center focus:outline-none focus:border-yellow-500"
                            />
                            <button
                              onClick={() => handleScore(sub.participantId.toString())}
                              disabled={scoreLoading}
                              className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                            >
                              {scoreLoading ? 'Saving...' : 'Submit Score'}
                            </button>
                            <button
                              onClick={() => { setScoringId(null); setScoreInput('') }}
                              className="text-gray-400 hover:text-white text-sm transition"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setScoringId(sub._id)}
                            className="text-sm bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 border border-yellow-700 px-4 py-2 rounded-lg transition"
                          >
                            ⭐ Give Score
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Leaderboard — shows when round is complete */}
        {room.round.status === 'complete' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-white font-bold text-lg mb-4">
              🏆 Final Leaderboard
            </h3>
            {sortedParticipants.length === 0 ? (
              <p className="text-gray-600 text-sm">No participants scored.</p>
            ) : (
              <div className="space-y-3">
                {sortedParticipants.map((p, index) => (
                  <div
                    key={p.userId}
                    className={`flex items-center justify-between rounded-xl px-5 py-4 ${
                      index === 0
                        ? 'bg-yellow-900/30 border border-yellow-700'
                        : 'bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </span>
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
                        {p.username[0].toUpperCase()}
                      </div>
                      <span className="text-white font-medium">{p.username}</span>
                    </div>
                    <span className={`text-2xl font-bold ${
                      index === 0 ? 'text-yellow-400' : 'text-gray-300'
                    }`}>
                      {p.score} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

function JobStatusBadge({ output, jobId }) {
  if (output) {
    return (
      <span className="bg-green-900/50 text-green-400 border border-green-700 text-xs px-2 py-1 rounded-full">
        ✅ completed
      </span>
    )
  }
  if (jobId) {
    return (
      <span className="bg-yellow-900/50 text-yellow-400 border border-yellow-700 text-xs px-2 py-1 rounded-full animate-pulse">
        ⚙️ generating...
      </span>
    )
  }
  return (
    <span className="bg-gray-700 text-gray-400 text-xs px-2 py-1 rounded-full">
      queued
    </span>
  )
}

function RoundStatusBadge({ status }) {
  const styles = {
    idle:     'bg-gray-700 text-gray-300',
    active:   'bg-green-900/50 text-green-400 border border-green-700',
    scoring:  'bg-yellow-900/50 text-yellow-400 border border-yellow-700',
    complete: 'bg-blue-900/50 text-blue-400 border border-blue-700',
  }
  const labels = {
    idle:     '⏳ Waiting to Start',
    active:   '🔥 Round Active',
    scoring:  '📊 Scoring',
    complete: '✅ Complete',
  }
  return (
    <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

export default RoomPage