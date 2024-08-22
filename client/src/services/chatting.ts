import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  getDocs,
  and,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import { Message } from '@/models/message'
import { User } from '@/models/user'

const messagesCollection = collection(db, 'messages')
const usersCollection = collection(db, 'users')

const setupUser = async (email: string, name: string | null) => {
  try {
    await addDoc(usersCollection, { email, name: name ?? '' })
  } catch (error) {
    console.log('Failed to create user: ', error)
  }
}

export const fetchUsers = async () => {
  const q = query(usersCollection, orderBy('name', 'asc'))
  try {
    const users = (await getDocs(q)).docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    return users as User[]
  } catch (error) {
    console.log('Failed to fetch users: ', error)
  }
}

export const confirmUser = async (email: string, name: string | null) => {
  const q = query(usersCollection, where('email', '==', email))
  try {
    const user = (await getDocs(q)).docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    if (!user.length) {
      setupUser(email, name)
    }

    return user[0] as User
  } catch (error) {
    console.log(`Failed to fetch user for ${email}: `, error)
  }
}

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

export const subscribeToSpecificMessages = (
  setMessages: (messages: Message[]) => void,
  { sender, receiver }: { sender: string; receiver: string }
) => {
  const q = query(
    messagesCollection,
    and(
      where('receiver_email', 'in', [sender, receiver]),
      where('sender_email', 'in', [sender, receiver])
    ),
    orderBy('createdAt')
  )
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => {
      return {
        id: doc.id,
        ...doc.data(),
      } as Message
    })

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

export const sendPrivateMessage = async (
  messageObject: Omit<Message, 'id' | 'createdAt'>
) => {
  try {
    await addDoc(messagesCollection, {
      ...messageObject,
      createdAt: new Date(),
    })
  } catch (error) {
    console.error('Error sending message: ', error)
  }
}
