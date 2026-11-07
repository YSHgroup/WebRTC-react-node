import { ImageResponse } from 'next/og'

export const alt = 'Huddle — team chat with built-in video calls'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: 'linear-gradient(135deg,#EEECFA 0%,#D9D0FF 100%)', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ width: 96, height: 96, borderRadius: 28, background: 'linear-gradient(135deg,#8B6BFF,#4B2BE0)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            {[0, 1, 2].map((i) => <div key={i} style={{ width: 14, height: 14, borderRadius: 14, background: '#fff' }} />)}
          </div>
          <div style={{ fontSize: 72, fontWeight: 800, color: '#1A1633' }}>Huddle</div>
        </div>
        <div style={{ marginTop: 40, fontSize: 52, fontWeight: 700, color: '#1A1633', lineHeight: 1.15, maxWidth: 900 }}>
          Team chat with built-in video calls.
        </div>
        <div style={{ marginTop: 20, fontSize: 30, color: '#5B35F0' }}>Free · private · runs in your browser</div>
      </div>
    ),
    size,
  )
}
