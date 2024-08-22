import Message from '@/components/chat/Message'
import MessageInput from '@/components/chat/MessageInput'

const PublicChatting = () => {
  return (
    <>
      <div className='group m-0 pt-16'>
        <header className='group__header '>
          <h2 className='group__title text-center text-xl font-bold m-2'>
            Group Chat
          </h2>
          <hr />
        </header>

          <section className='p-4' aria-description='message box'>
            <Message
              direction='left'
              message='Hi'
              user='S'
            ></Message>
              <Message
              direction='right'
              message='Hi, nice to meet you, so how are you doing now days?'
              user='D'
            ></Message>
          </section>

        <section className='fixed bottom-0 p-4 bg-white w-full'>
          <MessageInput />
        </section>
      </div>
    </>
  )
}

export default PublicChatting
