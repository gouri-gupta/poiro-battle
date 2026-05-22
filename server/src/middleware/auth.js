const jwt = require('jsonwebtoken')
const User = require('../models/User')

// This middleware runs BEFORE any protected route handler
// It checks: is this request coming from a logged-in user?
const protect = async (req, res, next) => {
  try {
    // Check if Authorization header exists
    // Header format: "Bearer eyJhbGciOiJIUzI1..."
    const token = req.headers.authorization?.split(' ')[1]

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' })
    }

    // Verify the token using our secret key
    // If token was tampered with, this throws an error
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Attach user to req object so route handlers can use it
    // .select('-password') means "get everything except password"
    req.user = await User.findById(decoded.id).select('-password')

    // Call next() to move to the actual route handler
    next()

  } catch (error) {
    res.status(401).json({ message: 'Not authorized, invalid token' })
  }
}

module.exports = { protect }