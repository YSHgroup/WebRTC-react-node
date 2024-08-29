import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import AppBar from './AppBar'
import { useContext, useEffect } from 'react'
import { AuthContext } from '@/context/AuthProvider'
import FloatingNav from './FloatingBar'
import SideBar from './Sidebar'
import SignalLight from '../signal/SignalLight'
import { SignalContext } from '@/context/SignalProvider'

export default function Layout({ nav }: { nav: undefined | boolean }) {
  const location = useLocation()
  const authPages = ['sign-in', 'sign-up']
  const hideAppBar = authPages.includes(location.pathname.split('/')[1])
  const navigate = useNavigate()
  const { currentUser } = useContext(AuthContext)
  const { signal } = useContext(SignalContext)

  useEffect(() => {
    if (location.pathname == '/') {
      navigate('/home')
    }

    if (currentUser && hideAppBar) {
      navigate('/home')
    }
  }, [navigate, location.pathname, hideAppBar, currentUser])

  return (
    <div className='w-full h-full'>
      {!hideAppBar && <AppBar />}
      {!hideAppBar && !nav && <FloatingNav />}
      {nav ? (
        <div className='flex h-full pt-16'>
          {signal && <SignalLight />}
          <nav className='fixed h-full w-[280px] border-r border-gray-300'>
            <SideBar />
          </nav>
          <main
            className='ml-[280px]'
            style={{ width: 'calc(100% - 280px)' }}
          >
            <Outlet />
          </main>
        </div>
      ) : (
        <Outlet />
      )}
    </div>
  )
}
