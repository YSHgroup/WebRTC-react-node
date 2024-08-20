import { createBrowserRouter } from 'react-router-dom'
import { commonRoutes } from './commonRoutes'
import { protectedRoute } from './protectedRoutes'

export const router = createBrowserRouter(
  [
    ...commonRoutes,
    protectedRoute
  ]
)
