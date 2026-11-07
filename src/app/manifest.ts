import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Huddle', short_name: 'Huddle', description: 'Team chat with built-in video calls.',
    start_url: '/chat', display: 'standalone', background_color: '#EEECFA', theme_color: '#5B35F0',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }
}
