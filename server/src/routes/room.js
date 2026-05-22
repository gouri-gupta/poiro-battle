const express = require('express')
const Room = require('../models/Room')
const Job = require('../models/Job')
const { protect } = require('../middleware/auth')
const { processJob } = require('../services/jobWorker')

const router = express.Router()

// We need io here to pass to processJob for broadcasting
// We use a pattern called "router factory" — export a function
// that takes io and returns the router
module.exports = (io) => {

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  // POST /api/rooms — Create room
  router.post('/', protect, async (req, res) => {
    try {
      const { challenge } = req.body
      if (!challenge || challenge.trim() === '') {
        return res.status(400).json({ message: 'Challenge prompt is required' })
      }

      let code
      let exists = true
      while (exists) {
        code = generateRoomCode()
        exists = await Room.findOne({ code })
      }

      const room = await Room.create({
        code,
        hostId: req.user._id,
        hostUsername: req.user.username,
        challenge: challenge.trim(),
      })

      res.status(201).json({ room })

    } catch (error) {
      console.error('Create room error:', error.message)
      res.status(500).json({ message: 'Server error' })
    }
  })

  // POST /api/rooms/join — Join room
  router.post('/join', protect, async (req, res) => {
    try {
      const { code } = req.body
      if (!code) {
        return res.status(400).json({ message: 'Room code is required' })
      }

      const room = await Room.findOne({ code: code.toUpperCase() })
      if (!room) {
        return res.status(404).json({ message: 'Room not found' })
      }

      if (room.status === 'finished') {
        return res.status(400).json({ message: 'This room has ended' })
      }

      if (room.hostId.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: 'You are the host of this room' })
      }

      const alreadyJoined = room.participants.some(
        (p) => p.userId.toString() === req.user._id.toString()
      )

      if (!alreadyJoined) {
        room.participants.push({
          userId: req.user._id,
          username: req.user.username,
        })
        await room.save()
      }

      res.json({ room })

    } catch (error) {
      console.error('Join room error:', error.message)
      res.status(500).json({ message: 'Server error' })
    }
  })

  // GET /api/rooms/:code — Get room
  router.get('/:code', protect, async (req, res) => {
    try {
      const room = await Room.findOne({
        code: req.params.code.toUpperCase()
      })

      if (!room) {
        return res.status(404).json({ message: 'Room not found' })
      }

      const isHost = room.hostId.toString() === req.user._id.toString()
      const isParticipant = room.participants.some(
        (p) => p.userId.toString() === req.user._id.toString()
      )

      if (!isHost && !isParticipant) {
        return res.status(403).json({ message: 'You are not in this room' })
      }

      res.json({ room })

    } catch (error) {
      console.error('Get room error:', error.message)
      res.status(500).json({ message: 'Server error' })
    }
  })

  // ─────────────────────────────────────────────
  // POST /api/rooms/:code/submit
  // Participant submits a prompt — creates async job
  // ─────────────────────────────────────────────
  router.post('/:code/submit', protect, async (req, res) => {
    try {
      const { prompt } = req.body
      const room = await Room.findOne({ code: req.params.code.toUpperCase() })

      if (!room) {
        return res.status(404).json({ message: 'Room not found' })
      }

      // Only participants can submit — not the host
      const isHost = room.hostId.toString() === req.user._id.toString()
      if (isHost) {
        return res.status(403).json({ message: 'Host cannot submit entries' })
      }

      // Round must be active
      if (room.round.status !== 'active') {
        return res.status(400).json({ message: 'Round is not active' })
      }

      // Check participant hasn't already submitted
      const alreadySubmitted = room.round.submissions.some(
        (s) => s.participantId.toString() === req.user._id.toString()
      )
      if (alreadySubmitted) {
        return res.status(400).json({ message: 'You already submitted' })
      }

      if (!prompt || prompt.trim() === '') {
        return res.status(400).json({ message: 'Prompt is required' })
      }

      // Create the job in DB
      const job = await Job.create({
        roomId: room._id,
        participantId: req.user._id,
        prompt: prompt.trim(),
        status: 'queued',
      })

      // Add submission to room with jobId linked
      room.round.submissions.push({
        participantId: req.user._id,
        username: req.user.username,
        prompt: prompt.trim(),
        jobId: job._id,
      })
      await room.save()

      // Broadcast updated room immediately
      // Everyone sees the submission appear with "queued" status
      io.to(room.code).emit('room_updated', { room })

      // Respond to client immediately — 202 Accepted
      // This means "we got it, processing in background"
      res.status(202).json({
        message: 'Submission received, generating...',
        jobId: job._id,
      })

      // Process job in background — NOT awaited
      // This is what makes it non-blocking
      // processJob runs independently after response is sent
      processJob(job._id.toString(), io)

    } catch (error) {
      console.error('Submit error:', error.message)
      res.status(500).json({ message: 'Server error' })
    }
  })

  // ─────────────────────────────────────────────
// POST /api/rooms/:code/score
// Host scores a submission
// ─────────────────────────────────────────────
router.post('/:code/score', protect, async (req, res) => {
  try {
    const { participantId, score } = req.body
    const room = await Room.findOne({ code: req.params.code.toUpperCase() })

    if (!room) {
      return res.status(404).json({ message: 'Room not found' })
    }

    // Backend enforced — only host can score
    if (room.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only host can score' })
    }

    // Validate score range
    if (score < 1 || score > 10) {
      return res.status(400).json({ message: 'Score must be between 1 and 10' })
    }

    // Find and update the submission score
    const submission = room.round.submissions.find(
      (s) => s.participantId.toString() === participantId
    )
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' })
    }

    submission.score = score

    // Update participant's total score in participants array
    const participant = room.participants.find(
      (p) => p.userId.toString() === participantId
    )
    if (participant) {
      participant.score = score
    }

    await room.save()

    // Broadcast updated room to everyone
    io.to(room.code).emit('room_updated', { room })

    res.json({ message: 'Score saved', room })

  } catch (error) {
    console.error('Score error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─────────────────────────────────────────────
// POST /api/rooms/:code/complete
// Host ends the round
// ─────────────────────────────────────────────
router.post('/:code/complete', protect, async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() })

    if (!room) {
      return res.status(404).json({ message: 'Room not found' })
    }

    if (room.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only host can complete round' })
    }

    room.round.status = 'complete'
    room.status = 'finished'
    await room.save()

    io.to(room.code).emit('room_updated', { room })

    res.json({ message: 'Round complete', room })

  } catch (error) {
    console.error('Complete error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
})

  return router
}