import PrivateRoute from '@/components/PivateRoute'
import Individual from '@/views/chat/Individual'
import PublicChatting from '@/views/chat/Public'
import { RouteObject } from 'react-router-dom'

export const protectedRoute: RouteObject = {
  path: '/chatting',
  element: <PrivateRoute />,
  children: [
    {
      path: 'individual',
      element: <Individual />
    },
    {
      path: 'group',
      element: <PublicChatting />
    }
  ]
}
