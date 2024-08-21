import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import AppBar from './AppBar'
import { useEffect } from 'react'

export default function Layout() {
  const location = useLocation()
  const authPages = ['sign-in', 'sign-up']
  const hideAppBar = authPages.includes(location.pathname.split('/')[1])
  const navigate = useNavigate()

  useEffect(() => {
    if(location.pathname == '/') {
      navigate('/home')
    }

    if(hideAppBar) {
      navigate(-1)
    }
    
  }, [navigate, location.pathname, hideAppBar])

  return (
    <div className='w-full'>
      {!hideAppBar && <AppBar />}
      <Outlet />
    </div>
  )
}
