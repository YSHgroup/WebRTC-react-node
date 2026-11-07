'use client'
import { useEffect, useState } from 'react'

export function useMedia(query: string, initial = false) {
  const [match, setMatch] = useState(initial)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatch(m.matches)
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return match
}
