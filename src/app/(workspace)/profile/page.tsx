'use client'
import { Bell, Camera, LogOut, Volume2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/Avatar'
import { ThemeToggle } from '@/components/layout/Rail'
import { useMe } from '@/hooks/useMe'
import { updateProfile } from '@/lib/chat/data'
import { logout } from '@/lib/auth/actions'
import { avatarFromFile } from '@/lib/image'
import { formatAsYouType, parsePhone } from '@/lib/phone'
import { useAuth } from '@/store/auth'
import {
  notificationSoundEnabled,
  notificationsEnabled,
  requestNotificationPermission,
  setNotificationSoundEnabled,
  setNotificationsEnabled,
} from '@/lib/notifications'

export default function ProfilePage() {
  const router = useRouter()
  const me = useMe()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [notificationSound, setNotificationSound] = useState(true)
  const file = useRef<HTMLInputElement>(null)
  const phoneLocked = !!me.profile?.phoneVerified // verified numbers can't be edited here

  useEffect(() => {
    if (me.profile) { setName(me.profile.displayName); setPhone(me.profile.phone ?? ''); setBio(me.profile.bio ?? '') }
  }, [me.profile])

  useEffect(() => {
    setNotifications(notificationsEnabled())
    setNotificationSound(notificationSoundEnabled())
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) return toast.error('Enter your name.')
    let phoneOut: string | null = me.phone
    if (!phoneLocked && phone.trim()) {
      const p = parsePhone(phone, 'US')
      if (!p) return toast.error('Enter a valid phone number, including the country code (e.g. +44…).')
      phoneOut = p.e164
    } else if (!phoneLocked) phoneOut = null
    setSaving(true)
    try {
      const user = await updateProfile({ displayName: name.trim(), bio: bio.trim().slice(0, 200), phone: phoneOut })
      useAuth.getState().setUser(user)
      if (user.needsVerification) {
        router.replace('/register?verify=1')
        return
      }
      toast.success('Profile saved')
    } catch (err) { toast.error((err as Error).message || 'Could not save your profile.') } finally { setSaving(false) }
  }

  const changePhoto = async (f?: File | null) => {
    if (!f) return
    try {
      useAuth.getState().setUser(await updateProfile({ photoDataUrl: await avatarFromFile(f) }))
      toast.success('Photo updated')
    } catch (err) { toast.error((err as Error).message || 'Could not use that image.') }
  }

  return (
    <div className="scroll-thin flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-lg px-5 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Profile</h1>
          <span className="flex items-center gap-1 md:hidden"><ThemeToggle /></span>
        </div>

        <div className="mt-6 flex flex-col items-center">
          <button onClick={() => file.current?.click()} aria-label="Change photo" className="group relative rounded-full">
            <Avatar name={me.name} src={me.photo} size={104} />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"><Camera size={24} /></span>
          </button>
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { changePhoto(e.target.files?.[0]); e.target.value = '' }} />
          <p className="mt-3 text-lg font-bold">{me.name}</p>
          {bio && <p className="text-sm text-mute">{bio}</p>}
        </div>

        <form onSubmit={save} className="mt-8 space-y-4">
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-mute">Full name</span>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-mute">Email</span>
            <input className="field opacity-70" value={me.email ?? ''} readOnly placeholder="No email on this account" /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-mute">Phone</span>
            <input className="field disabled:opacity-70" value={phoneLocked ? me.phone ?? '' : phone} disabled={phoneLocked} onChange={(e) => setPhone(formatAsYouType(e.target.value))} inputMode="tel" autoComplete="tel" placeholder="+1 202 555 0140" /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-mute">Bio</span>
            <textarea className="field min-h-[84px] resize-y" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} placeholder="Design is thinking made visual." /></label>
          <button className="btn-primary w-full" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
        </form>

        <section className="mt-6 overflow-hidden rounded-2xl border border-line">
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="flex items-center gap-2 text-sm font-medium"><Bell size={16} /> Notifications</span>
            <button
              type="button"
              role="switch"
              aria-checked={notifications}
              onClick={async () => {
                const next = !notifications
                if (next) {
                  const permission = await requestNotificationPermission()
                  if (permission === 'denied' || permission === 'unsupported') {
                    toast.error('Desktop notifications are unavailable in this browser.')
                    return
                  }
                }
                setNotifications(next)
                setNotificationsEnabled(next)
              }}
              className={`relative h-6 w-11 rounded-full transition ${notifications ? 'bg-brand-600' : 'bg-line'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${notifications ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between border-t border-line px-4 py-3.5">
            <span className="flex items-center gap-2 text-sm font-medium"><Volume2 size={16} /> Notification sound</span>
            <button
              type="button"
              role="switch"
              aria-checked={notificationSound}
              onClick={() => {
                setNotificationSound(!notificationSound)
                setNotificationSoundEnabled(!notificationSound)
              }}
              className={`relative h-6 w-11 rounded-full transition ${notificationSound ? 'bg-brand-600' : 'bg-line'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${notificationSound ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
        </section>

        <button onClick={() => logout()} className="btn-ghost mt-3 w-full text-red-500"><LogOut size={16} /> Sign out</button>
      </div>
    </div>
  )
}
