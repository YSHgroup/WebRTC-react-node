'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { useMe } from '@/hooks/useMe'
import { createGroup } from '@/lib/chat/data'
import { useChat } from '@/store/chat'

export function CreateGroupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const { uid } = useMe()
  const users = useChat((s) => s.users)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const people = useMemo(
    () => Object.values(users).filter((u) => u.uid !== uid).sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [users, uid],
  )

  const toggle = (id: string) =>
    setSelected((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) return toast.error('Enter a group name.')
    setBusy(true)
    try {
      const id = await createGroup(uid, name, description, selected, isPublic)
      toast.success('Group created')
      setName('')
      setDescription('')
      setIsPublic(false)
      setSelected([])
      onClose()
      router.push(`/chat/${id}`)
    } catch (error) {
      toast.error((error as Error).message || 'Could not create the group.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create group">
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-mute">Group name</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-mute">Description</span>
          <textarea className="field min-h-[72px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
        </label>
        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-mute">Visibility</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium">Public group</span>
              <span className="block text-xs text-mute">Anyone can search for and join this group.</span>
            </span>
          </label>
          {!isPublic && <p className="mt-2 text-xs text-mute">Private groups can only gain members when an admin adds them.</p>}
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-mute">Members</legend>
          <ul className="max-h-52 space-y-0.5 overflow-y-auto">
            {people.map((u) => (
              <li key={u.uid}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl p-2 hover:bg-sunken">
                  <input type="checkbox" checked={selected.includes(u.uid)} onChange={() => toggle(u.uid)} />
                  <Avatar name={u.displayName} src={u.photoURL} size={34} />
                  <span className="min-w-0 truncate text-sm font-medium">{u.displayName}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create group'}</button>
      </form>
    </Modal>
  )
}
