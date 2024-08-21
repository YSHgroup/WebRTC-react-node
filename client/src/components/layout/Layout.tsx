import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import AppBar from './AppBar'
import { useEffect } from 'react'

export default function Layout() {
  const location = useLocation()
  const hideAppBarPaths = ['sign-in', 'sign-up']
  const hideAppBar = hideAppBarPaths.includes(location.pathname.split('/')[1])
  const navigate = useNavigate()

  useEffect(() => {
    if(location.pathname == '/') {
      navigate('/home')
    }
  }, [navigate, location.pathname])

  return (
    <div className='w-full'>
      {!hideAppBar && <AppBar />}
      <Outlet />
    </div>
  )
}
