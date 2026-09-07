import axios from 'axios'
import toast from './toastStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status

    if (status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      toast.error('Your session has expired. Please log in again.')

      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }

    error.message =
      error.response?.data?.message ||
      (error.code === 'ERR_NETWORK'
        ? 'Cannot reach the server. Is the backend running on port 5000?'
        : error.message) ||
      'Something went wrong'

    return Promise.reject(error)
  }
)

export default api
