import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore.js'

export default function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()
  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  }
  return children
}
