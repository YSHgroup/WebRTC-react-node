import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import { Message } from '@/models/message'

const messagesCollection = collection(db, 'messages')

export const subscribeToAllMessages = (
  setMessages: (messages: Message[]) => void
) => {
  const q = query(messagesCollection, orderBy('createdAt'))
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs
      .map((doc) => {
        return {
          id: doc.id,
          ...doc.data(),
        } as Message
      })
      .filter((message) => message.receiver_email == '@all')
    setMessages(messages)
  })
}

export const sendPublicMessage = async (
  messageObject: Omit<
    Message,
    'id' | 'createdAt' | 'receiver_email' | 'receiver_name'
  >
) => {
  try {
    await addDoc(messagesCollection, {
      ...messageObject,
      createdAt: new Date(),
      receiver_email: '@all',
      receiver_name: 'All Users',
    })
  } catch (error) {
    console.error('Error sending message: ', error)
  }
}
