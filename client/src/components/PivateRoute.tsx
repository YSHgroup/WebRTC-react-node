import { useContext } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { AuthContext } from '@/context/AuthProvider'

const PrivateRoute = () => {
  const user = useContext(AuthContext)

  return user? <Outlet/>: <Navigate to='/sign-in' replace />
}

export default PrivateRoute