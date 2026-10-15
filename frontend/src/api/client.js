import axios from 'axios'
import { useAuthStore } from '../store/authStore.js'
import { SESSION_EXPIRED_EVENT } from '../utils/editorRecovery.js'

// 8001, not Django's 8000: that port is the default for every Django project on
// the machine, so whichever one starts first wins it and the others silently
// talk to a stranger's API. Overridable with VITE_API_URL.
const baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api'

const client = axios.create({ baseURL })

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token && !config.publicAuth) {
    config.headers.Authorization = `Token ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const token = useAuthStore.getState().token
    // A delayed response from an old session must not sign out a new one.
    // A refused public login is not evidence that the active guest expired.
    if (error.response?.status === 401 && token && !error.config?.publicAuth &&
        error.config?.headers?.Authorization === `Token ${token}`) {
      const event = new Event(SESSION_EXPIRED_EVENT, { cancelable: true })
      // Capture the live editor before ProtectedRoute unmounts it. If storage
      // is unavailable the editor cancels the redirect so export remains possible.
      if (window.dispatchEvent(event)) useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  },
)

export default client
