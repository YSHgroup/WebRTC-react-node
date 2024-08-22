import { AuthContext } from '@/context/AuthProvider'
// import type { Message as MessageModel } from '@/models/message'
// import { subscribeToSpecificMessages } from '@/services/chatting'
import { useContext, useEffect, useState } from 'react'

import { confirmUser, fetchUsers } from '@/services/chatting'
import { User } from '@/models/user'
import { Link } from 'react-router-dom'

const DmSelection = () => {
  const [users, setUsers] = useState<User[]>()
  const { currentUser } = useContext(AuthContext)

  useEffect(() => {
    fetchUsers().then((users) => setUsers(users))
    confirmUser(currentUser!.email as string, currentUser!.displayName)
  }, [currentUser])
  return (
    <>
      <div className='individual m-0 pt-16'>
        <header className='individual__header '>
          <h2 className='individual__title text-center text-xl font-bold m-2'>
            Personal Chat - users
          </h2>
          <hr />
        </header>

        <section
          className='p-4'
          aria-description='users box'
        >
          <ul className='m-2 px-2'>
            {users?.map(
              (user) =>
                currentUser?.email != user.email && (
                  <li key={user.id}>
                    <Link
                      to={user.email}
                      className='flex justify-between items-center border-b border-sky-500 py-2 cursor-pointer hover:-translate-y-1 text-sky-800 hover:text-green-400 hover:border-green-400'
                    >
                      <span className=' font-semibold text-xl italic'>
                        {user.name ?? '[name]'}
                      </span>
                      <span className='text-xl'>{user.email}</span>
                    </Link>
                  </li>
                )
            )}
          </ul>
        </section>
      </div>
    </>
  )
}

export default DmSelection
