import PrivateRoute from '@/components/PivateRoute'
import { confirmUser } from '@/services/chatting'
import DmSelection from '@/views/chat/DmSelection'
import Individual from '@/views/chat/Individual'
import PublicChatting from '@/views/chat/Public'
import { LoaderFunction, Params, RouteObject } from 'react-router-dom'

const userLoader: LoaderFunction<{ params: Params<string> }> = async({params}: { params: Params<string> }) => {
  const { email } = params
  const user = await confirmUser(email!, null)
  return user
}

export const protectedRoute: RouteObject = {
  path: '/chatting',
  element: <PrivateRoute />,
  children: [
    {
      path: 'individual',
      element: <DmSelection />,
    },
    {
      path: 'individual/:email',
      loader: userLoader,
      element: <Individual />
    },
    {
      path: 'group',
      element: <PublicChatting />
    }
  ]
}
