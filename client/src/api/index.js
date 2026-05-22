//All axios calls in one place -> Frontend's phone book
import axios from 'axios'

// Create an axios instance with base URL
// So instead of writing full URL every time,
// we just write the path like '/auth/register'
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
})

// Interceptor — runs before EVERY request automatically
// Its job: attach the JWT token to every request header
//Why interceptors? Without this you'd write headers: { Authorization: Bearer ${token} } in every single API call. The interceptor does it automatically for every request.
api.interceptors.request.use((config) => {
  // Get token from localStorage
  const token = localStorage.getItem('token')

  // If token exists, add it to Authorization header
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default api