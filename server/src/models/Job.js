const mongoose = require('mongoose')

const jobSchema = new mongoose.Schema(
  {
    // Which room this job belongs to
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },

    // Which participant submitted this
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // The prompt they submitted
    prompt: {
      type: String,
      required: true,
    },

    // Job lifecycle status
    // queued     → job created, not started yet
    // running    → AI is generating
    // completed  → AI finished successfully
    // failed     → something went wrong
    // timed_out  → took too long
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed', 'timed_out'],
      default: 'queued',
    },

    // AI generated output — null until job completes
    output: {
      type: String,
      default: null,
    },

    // Error message if job failed
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

const Job = mongoose.model('Job', jobSchema)
module.exports = Job