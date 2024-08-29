import Message from '@/components/chat/Message'
import MessageInput from '@/components/chat/MessageInput'
import { AuthContext } from '@/context/AuthProvider'
import { SignalContext } from '@/context/SignalProvider'
import { Message as MessageModel } from '@/models/message'
import { confirmUser, subscribeToAllMessages } from '@/services/chatting'
import { useContext, useEffect, useRef, useState } from 'react'

const PublicChatting = () => {
  const [messages, setMessages] = useState<MessageModel[]>()
  const publicBoxRef = useRef<HTMLDivElement | null>(null)
  const { currentUser } = useContext(AuthContext)
  const { setSignal } =useContext(SignalContext)

  useEffect(() => {
    if(publicBoxRef.current) {
      publicBoxRef.current.lastElementChild?.scrollIntoView()
    }
  }, [publicBoxRef.current?.lastElementChild])

  useEffect(() => {
    confirmUser(currentUser!.email as string, currentUser!.displayName)
    const unsubscribe = subscribeToAllMessages(setMessages, setSignal)
    return () => unsubscribe()
  }, [currentUser, setSignal])

  return (
    <>
      <div className='group m-0 h-full'>
        <header className='group__header '>
          <h2 className='group__title text-center text-xl font-bold p-2'>
            Group Chat
          </h2>
          <hr />
        </header>

        <section
          className='message-box p-4'
          aria-description='message box'
        >
          <div  ref={publicBoxRef}>
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
          <MessageInput type='group' />
        </section>
      </div>
    </>
  )
}

export default PublicChatting
