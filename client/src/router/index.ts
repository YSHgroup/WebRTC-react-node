import { createBrowserRouter } from 'react-router-dom'
import { commonRoutes } from './commonRoutes'

export const router = createBrowserRouter(
  [
    ...commonRoutes,
  ]
)
