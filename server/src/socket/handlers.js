//all socket events on backend
const Room = require('../models/Room')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

// Helper — verify JWT and return user
// We need this because socket connections don't go through Express middleware — so we verify manually here
const getUserFromToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select('-password')
    return user
  } catch {
    return null
  }
}

// This function receives the `io` instance and sets up
// all socket event listeners
const setupSocketHandlers = (io) => {

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id)

    // ─────────────────────────────────────────────
    // Event: join_room
    // Client sends this when they open the RoomPage
    // ─────────────────────────────────────────────
    socket.on('join_room', async ({ roomCode, token }) => {
      try {
        // Verify the user
        const user = await getUserFromToken(token)
        if (!user) {
          socket.emit('error', { message: 'Unauthorized' })
          return
        }

        // Find the room in DB
        const room = await Room.findOne({ code: roomCode.toUpperCase() })
        if (!room) {
          socket.emit('error', { message: 'Room not found' })
          return
        }

        // Make this socket join the Socket.IO room
        // Socket.IO rooms are like channels — broadcast to everyone in it
        socket.join(roomCode.toUpperCase())

        console.log(`${user.username} joined socket room: ${roomCode}`)

        // Send current room state to THIS user only
        // so their UI loads immediately
        socket.emit('room_updated', { room })

      } catch (error) {
        console.error('join_room error:', error.message)
        socket.emit('error', { message: 'Failed to join room' })
      }
    })

    // ─────────────────────────────────────────────
    // Event: start_round
    // Only host can trigger this
    // ─────────────────────────────────────────────
    socket.on('start_round', async ({ roomCode, token }) => {
      try {
        const user = await getUserFromToken(token)
        if (!user) return socket.emit('error', { message: 'Unauthorized' })

        const room = await Room.findOne({ code: roomCode.toUpperCase() })
        if (!room) return socket.emit('error', { message: 'Room not found' })

        // Backend check — only host can start round
        if (room.hostId.toString() !== user._id.toString()) {
          return socket.emit('error', { message: 'Only host can start the round' })
        }

        // Check round isn't already started
        if (room.round.status !== 'idle') {
          return socket.emit('error', { message: 'Round already started' })
        }

        // Update round status in DB
        room.round.status = 'active'
        room.round.startedAt = new Date()
        room.status = 'active'
        await room.save()

        // Broadcast updated room to EVERYONE in this socket room
        // io.to(roomCode) sends to ALL connected users in that room
        io.to(roomCode.toUpperCase()).emit('room_updated', { room })

        console.log(`Round started in room: ${roomCode}`)

      } catch (error) {
        console.error('start_round error:', error.message)
        socket.emit('error', { message: 'Failed to start round' })
      }
    })

    // ─────────────────────────────────────────────
    // Event: disconnect
    // ─────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id)
    })
  })
}

module.exports = setupSocketHandlers