const Job = require('../models/Job')
const Room = require('../models/Room')
const aiProvider = require('./aiProvider')

// processJob runs in the background — completely separate from
// the HTTP request that created the job
// io = Socket.IO instance so we can broadcast updates
const processJob = async (jobId, io) => {
  try {
    // Step 1 — Mark job as running
    const job = await Job.findById(jobId)
    if (!job) return

    job.status = 'running'
    await job.save()

    // Broadcast job status to everyone in the room
    io.to(job.roomId.toString()).emit('job_update', {
      jobId: job._id,
      status: 'running',
      output: null,
    })

    console.log(`Job ${jobId} → running`)

    // Step 2 — Call AI provider (takes 3-6 seconds)
    const result = await aiProvider.generate(job.prompt)

    // Step 3a — AI succeeded
    if (result.success) {
      job.status = 'completed'
      job.output = result.output
      await job.save()

      // Update the submission inside Room with the output
      const room = await Room.findById(job.roomId)
      if (room) {
        const submission = room.round.submissions.find(
          (s) => s.jobId && s.jobId.toString() === jobId.toString()
        )
        if (submission) {
          submission.output = result.output
          await room.save()
        }

        // Broadcast full updated room to everyone
        io.to(room.code).emit('room_updated', { room })
      }

      // Also broadcast job completion
      io.to(job.roomId.toString()).emit('job_update', {
        jobId: job._id,
        status: 'completed',
        output: result.output,
      })

      console.log(`Job ${jobId} → completed`)

    // Step 3b — AI failed
    } else {
      job.status = 'failed'
      job.error = result.error
      await job.save()

      io.to(job.roomId.toString()).emit('job_update', {
        jobId: job._id,
        status: 'failed',
        error: result.error,
      })

      console.log(`Job ${jobId} → failed: ${result.error}`)
    }

  } catch (error) {
    console.error(`Job ${jobId} crashed:`, error.message)

    // Mark job as failed if something unexpected happened
    await Job.findByIdAndUpdate(jobId, {
      status: 'failed',
      error: 'Unexpected worker error',
    })
  }
}

module.exports = { processJob }