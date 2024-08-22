import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import AppBar from './AppBar'
import { useContext, useEffect } from 'react'
import { AuthContext } from '@/context/AuthProvider'
import FloatingNav from './FloatingBar'

export default function Layout() {
  const location = useLocation()
  const authPages = ['sign-in', 'sign-up']
  const hideAppBar = authPages.includes(location.pathname.split('/')[1])
  const navigate = useNavigate()
  const { currentUser } = useContext(AuthContext)

  useEffect(() => {
    if(location.pathname == '/') {
      navigate('/home')
    }

    if(currentUser && hideAppBar) {
      navigate('/home')
    }
  
  }, [navigate, location.pathname, hideAppBar, currentUser])

  return (
    <div className='w-full'>
      {!hideAppBar && <AppBar />}
      {!hideAppBar && <FloatingNav />}
      <Outlet />
    </div>
  )
}
