//Register + Login form
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

function LoginPage() {
  // Toggle between login and register form
  const [isLogin, setIsLogin] = useState(true)

  // Form field state
  const [username, setUsername] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')

  // Get actions and state from Zustand store
  const { login, register, loading, error, clearError } = useAuthStore()

  // useNavigate lets us redirect to another page
  const navigate = useNavigate()

  // Runs when form is submitted
  const handleSubmit = async (e) => {
    e.preventDefault() // stops page from refreshing on submit
    clearError()

    let result

    if (isLogin) {
      result = await login(email, password)
    } else {
      result = await register(username, email, password)
    }

    // If success, go to lobby page
    if (result.success) {
      navigate('/lobby')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md">

        {/* Title */}
        <h1 className="text-3xl font-bold text-white text-center mb-2">
          ⚔️ Poiro Battle
        </h1>
        <p className="text-gray-400 text-center mb-8">
          {isLogin ? 'Welcome back' : 'Create your account'}
        </p>

        {/* Error message */}
        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Username — only show on register */}
          {!isLogin && (
            <div>
              <label className="block text-gray-400 text-sm mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your battle name"
                required
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition"
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-3 transition mt-2"
          >
            {loading
              ? 'Please wait...'
              : isLogin ? 'Login' : 'Create Account'}
          </button>
        </form>

        {/* Toggle between login and register */}
        <p className="text-gray-400 text-center mt-6 text-sm">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setIsLogin(!isLogin); clearError() }}
            className="text-purple-400 hover:text-purple-300 font-medium"
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>

      </div>
    </div>
  )
}

export default LoginPage