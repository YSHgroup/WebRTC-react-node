import { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import { AuthContext } from '@/context/AuthProvider'
import Layout from './layout/Layout'

const PrivateRoute = () => {
  const { currentUser } = useContext(AuthContext)

  return currentUser? <Layout/>: <Navigate to='/sign-in' replace />
}

export default PrivateRoute