const mongoose = require('mongoose')

const roomSchema = new mongoose.Schema(
  {
    // 6-character unique join code e.g. "XK92MF"
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },

    // Who created this room
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Host's username — stored directly so we don't need
    // to do extra DB lookups just to show the host name
    hostUsername: {
      type: String,
      required: true,
    },

    // The creative challenge for this battle
    challenge: {
      type: String,
      required: true,
      trim: true,
    },

    // Room lifecycle status
    // waiting  → room created, waiting for participants
    // active   → round is running
    // finished → battle is over
    status: {
      type: String,
      enum: ['waiting', 'active', 'finished'],
      default: 'waiting',
    },

    // Array of people who joined (NOT including host)
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        username: String,
        score: {
          type: Number,
          default: 0,
        },
        eliminated: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // The one round — embedded inside the room
    round: {
      // idle     → not started yet
      // active   → participants can submit
      // scoring  → host is scoring
      // complete → round done
      status: {
        type: String,
        enum: ['idle', 'active', 'scoring', 'complete'],
        default: 'idle',
      },

      startedAt: {
        type: Date,
        default: null,
      },

      // All submissions for this round
      submissions: [
        {
          participantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          username: String,
          prompt: String,

          // Links to the Job document for this submission
          jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job',
            default: null,
          },

          // AI generated output — filled when job completes
          output: {
            type: String,
            default: null,
          },

          // Score assigned by host
          score: {
            type: Number,
            default: null,
          },

          submittedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
  },
  {
    timestamps: true,
  }
)

const Room = mongoose.model('Room', roomSchema)
module.exports = Room