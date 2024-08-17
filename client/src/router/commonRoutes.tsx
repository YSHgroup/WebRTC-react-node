import { Navigate, RouteObject } from 'react-router-dom'
import Home from '@/views/Home'


export const commonRoutes: RouteObject[] = [
  {
    path: '/',
    element: <Navigate to='/home' />
  },
  {
    path: '/home',
    element: <Home/>,
  }
]
