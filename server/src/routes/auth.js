const express = require('express')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const router = express.Router()

// Helper function to create a JWT token
// Takes a user id, signs it with our secret, expires in 7 days
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// ─────────────────────────────────────────────
// POST /api/auth/register
// Creates a new user account
// ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    // Check all fields are provided
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    // Check if email already exists in DB
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    // Create new user — password gets hashed automatically
    // because of the pre('save') hook we wrote in User.js
    const user = await User.create({ username, email, password })

    // Send back token + user info (never send password)
    res.status(201).json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    })

  } catch (error) {
    console.error('Register error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─────────────────────────────────────────────
// POST /api/auth/login
// Logs in existing user
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    // Find user by email in DB
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Use the matchPassword method we defined in User.js
    const isMatch = await user.matchPassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Send back token + user info
    res.json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    })

  } catch (error) {
    console.error('Login error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─────────────────────────────────────────────
// GET /api/auth/me
// Returns current logged in user (protected)
// ─────────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    // Get token from request header
    const token = req.headers.authorization?.split(' ')[1]

    if (!token) {
      return res.status(401).json({ message: 'No token provided' })
    }

    // Verify token and extract user id
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Find user in DB (exclude password field)
    const user = await User.findById(decoded.id).select('-password')
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({ user })

  } catch (error) {
    res.status(401).json({ message: 'Invalid token' })
  }
})

module.exports = router