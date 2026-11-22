const ENABLED_KEY = 'huddle.notifications.enabled'
const SOUND_KEY = 'huddle.notifications.sound'
const CONVERSATION_KEY = 'huddle.notifications.conversations'

function readBool(key: string, fallback: boolean) {
  if (typeof window === 'undefined') return fallback
  const value = localStorage.getItem(key)
  return value === null ? fallback : value === 'true'
}

export function notificationsEnabled() {
  return readBool(ENABLED_KEY, true)
}

export function setNotificationsEnabled(enabled: boolean) {
  localStorage.setItem(ENABLED_KEY, String(enabled))
}

export function notificationSoundEnabled() {
  return readBool(SOUND_KEY, true)
}

export function setNotificationSoundEnabled(enabled: boolean) {
  localStorage.setItem(SOUND_KEY, String(enabled))
}

export function conversationNotificationsEnabled(cid: string) {
  if (typeof window === 'undefined') return true
  const disabled = JSON.parse(localStorage.getItem(CONVERSATION_KEY) ?? '[]') as string[]
  return !disabled.includes(cid)
}

export function setConversationNotificationsEnabled(cid: string, enabled: boolean) {
  const disabled = JSON.parse(localStorage.getItem(CONVERSATION_KEY) ?? '[]') as string[]
  const next = enabled ? disabled.filter((id) => id !== cid) : Array.from(new Set([...disabled, cid]))
  localStorage.setItem(CONVERSATION_KEY, JSON.stringify(next))
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

export function playNotificationSound() {
  if (!notificationSoundEnabled()) return
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.setValueAtTime(880, context.currentTime)
    oscillator.frequency.setValueAtTime(660, context.currentTime + 0.08)
    gain.gain.setValueAtTime(0.08, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.22)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.22)
    oscillator.addEventListener('ended', () => void context.close())
  } catch {
    // Browser audio policies can reject notification sounds; keep chat usable.
  }
}

export function showMessageNotification(title: string, body: string) {
  if (!notificationsEnabled() || !('Notification' in window) || Notification.permission !== 'granted') return
  if (document.visibilityState === 'visible') return
  new Notification(title, { body, icon: '/huddle.jpg', tag: 'huddle-message' })
}
