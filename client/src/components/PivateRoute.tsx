import { useContext } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { AuthContext } from '@/context/AuthProvider'

const PrivateRoute = () => {
  const { currentUser } = useContext(AuthContext)

  return currentUser? <Outlet/>: <Navigate to='/sign-in' replace />
}

export default PrivateRoute