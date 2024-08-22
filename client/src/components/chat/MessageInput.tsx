import { AuthContext } from '@/context/AuthProvider'
import { sendPublicMessage } from '@/services/chatting'
import { KeyboardEventHandler, useContext, useState } from 'react'

const MessageInput = ({type}: {type: 'group' | 'personal'}) => {
  const [text, setText] = useState<string>('')
  const { currentUser } = useContext(AuthContext)

  const sendMessage = () => {
    if (text.trim() === '') return
    if (type == 'group') {
      sendPublicMessage({
        text: text.trim(),
        sender_email: currentUser!.email as string,
        sender_name: currentUser!.displayName ?? '',
      })
    }
    setText('')
  }
  const enterDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key == 'Enter' && !e.shiftKey) {
      sendMessage()
    }
    return
  }

  return (
    <div className='flex'>
      <label className='text-start flex w-full'>
        <span className='text-gray-600 leading-7'>Message: </span>
        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={enterDown}
          className='w-full rounded border border-sky-400 p-1 focus:outline-none mx-2 focus:shadow'
          placeholder='Type a message...'
        />
      </label>
      <button
        onClick={sendMessage}
        className='text-sky-700 hover:drop-shadow hover:underline'
      >
        Send
      </button>
    </div>
  )
}

export default MessageInput
