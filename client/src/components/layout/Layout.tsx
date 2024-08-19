import { Outlet, useLocation } from 'react-router-dom'
import AppBar from './AppBar'

export default function Layout() {
  const location = useLocation()
  const hideAppBarPaths = ['sign-in', 'sign-up']
  const hideAppBar = hideAppBarPaths.includes(location.pathname.split('/')[1])

  return (
    <div className='w-full'>
      {!hideAppBar && <AppBar />}
      <Outlet />
    </div>
  )
}
