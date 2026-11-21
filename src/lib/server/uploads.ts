/** Vercel functions accept request bodies up to 4.5 MB; stay comfortably under. */
export const MAX_BYTES = 3 * 1024 * 1024
/** Only these are ever displayed inline. SVG is deliberately excluded (it can carry scripts). */
export const INLINE_IMAGES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
