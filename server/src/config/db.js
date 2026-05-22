//connect Express to your Atlas database.
// Import mongoose — this is the library that talks to MongoDB + lets us define schema
const mongoose = require('mongoose')

// This function connects our server to MongoDB Atlas
//async -> We make this function async because connecting to a database takes time — it's a network call. We don't want to block the rest of the server while waiting.
const connectDB = async () => {

  try {
    // mongoose.connect() takes your connection string from .env
    // and attempts to open a connection
    const conn = await mongoose.connect(process.env.MONGO_URI)
    //After connecting, Mongoose gives back a connection object. .host tells you which server you connected to — useful for confirming Atlas connected vs local MongoDB.

    // If successful, log which host we connected to
    console.log(`MongoDB Connected: ${conn.connection.host}`)

  } catch (error) {
    // If connection fails, log the error message
    console.error(`MongoDB connection error: ${error.message}`)

    // Exit the process with failure code 1
    // This stops the server from running without a DB connection
    process.exit(1)
  }
}

// Export so index.js can use it
module.exports = connectDB