import Message from '@/components/chat/Message'
import MessageInput from '@/components/chat/MessageInput'
import { AuthContext } from '@/context/AuthProvider'
import type { Message as MessageModel } from '@/models/message'
import { User } from '@/models/user'
import { subscribeToSpecificMessages } from '@/services/chatting'
import { useContext, useEffect, useRef, useState } from 'react'
import { useLoaderData, useParams } from 'react-router-dom'

const Individual = () => {
  const { email } = useParams()
  const privateBoxRef = useRef<HTMLDivElement | null>(null)
  const [messages, setMessages] = useState<MessageModel[]>()
  const { currentUser } = useContext(AuthContext)
  const user = useLoaderData() as User

  useEffect(() => {
    if(privateBoxRef.current) {
      privateBoxRef.current.lastElementChild?.scrollIntoView()
    }
  }, [privateBoxRef.current?.lastElementChild])

  useEffect(() => {
    if (email) {
      const unSubscribe = subscribeToSpecificMessages(setMessages, {
        sender: currentUser!.email as string,
        receiver: email as string,
      })
      return () => unSubscribe()
    }
  }, [email, currentUser])

  return (
    <>
      <div className='individual m-0'>
        <header className='individual__header '>
          <h2 className='individual__title text-center text-xl font-bold p-2'>
            Personal Chat
          </h2>
          <hr />
        </header>

        <section
          className='message-box p-4'
          aria-description='message box'
        >
          <div ref={privateBoxRef}>
            {messages?.map((message) => {
              return (
                <Message
                  key={message.id}
                  message={message.text}
                  user={
                    message.sender_name
                      ? message.sender_name.charAt(0).toUpperCase()
                      : message.sender_email.charAt(0).toUpperCase()
                  }
                  direction={
                    currentUser?.email === message.sender_email ? 'right' : 'left'
                  }
                />
              )
            })}
          </div>
        </section>

        <section
          className='fixed bottom-0 p-4 bg-white'
          style={{ width: 'calc(100% - 280px)' }}
        >
          <MessageInput
            type='personal'
            receiverEmail={user.email}
            receiverName={user.name}
          />
        </section>
      </div>
    </>
  )
}

export default Individual
