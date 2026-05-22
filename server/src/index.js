require('dotenv').config()

const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const connectDB = require('./config/db')
const authRoutes = require('./routes/auth')
const setupSocketHandlers = require('./socket/handlers')

const app = express()
const httpServer = http.createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
})

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

connectDB()

app.use('/api/auth', authRoutes)

// Pass io into room routes — needed for broadcasting job updates
const roomRoutes = require('./routes/room')(io)
app.use('/api/rooms', roomRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'Poiro Battle Server is running!' })
})

setupSocketHandlers(io)

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})