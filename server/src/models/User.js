const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

// Define what a User document looks like in MongoDB
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,         // removes accidental spaces
    },

    email: {
      type: String,
      required: true,
      unique: true,       // no two users can have same email
      lowercase: true,    // always store as lowercase
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
)

// This runs BEFORE a user is saved to the database
// Its job is to hash the plain text password
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 10)
})
// .save() writes a document to MongoDB
// .pre() -> This is a Mongoose middleware hook. It fires automatically before every .save() call. 
// We use it to hash the password so we never store plain text passwords in MongoDB. Ever.
//In newer versions of Mongoose (v7+), async pre-hooks don't use next() — Mongoose handles it automatically when you use async. Calling next() in an async hook actually breaks it because next isn't passed as a parameter. Removing it fixes the issue cleanly.

// A method we can call on any user object to check password
// user.matchPassword('plaintext') returns true or false
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}
//We attach a custom method to every User document. Later in the login route we call user.matchPassword(req.body.password) cleanly

// Create the model from schema and export it
// 'User' becomes the collection name 'users' in MongoDB
const User = mongoose.model('User', userSchema)
module.exports = User