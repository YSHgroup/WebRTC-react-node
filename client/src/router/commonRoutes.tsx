import { RouteObject } from 'react-router-dom'
import Home from '@/views/Home'
import ErrorPage from './ErrorPage'
import SignIn from '@/views/auth/Signin'
import Layout from '@/components/layout/Layout'
import Signup from '@/views/auth/Signup'

export const commonRoutes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    ErrorBoundary: ErrorPage,
    children: [
      {
        path: '/home',
        element: <Home />,
        errorElement: <ErrorPage />,
      },
      {
        path: '/sign-in',
        element: <SignIn />,
        errorElement: <ErrorPage />,
      },
      {
        path: '/sign-up',
        element: <Signup />,
        errorElement: <ErrorPage />,
      },
    ],
  },
]
