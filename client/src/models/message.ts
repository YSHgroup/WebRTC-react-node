export interface Message {
  id: string
  sender_email: string
  receiver_email: string
  receiver_name: string
  sender_name: string
  text: string
  createdAt: number
}