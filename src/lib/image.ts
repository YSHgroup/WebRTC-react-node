import type { PendingAttachment } from './types'

export const MAX_FILE_BYTES = 3 * 1024 * 1024 // matches the server limit (Vercel request bodies max out at 4.5 MB)

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process that image.'))), 'image/jpeg', quality))

/** Downscales a photo to fit inside max×max and re-encodes it as JPEG. */
async function compressImage(file: File, max = 1600, quality = 0.78): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return canvasToBlob(canvas, quality)
}

export async function fileToPending(file: File): Promise<PendingAttachment> {
  const compressible = file.type.startsWith('image/') && !['image/gif', 'image/svg+xml'].includes(file.type)
  if (compressible) {
    let blob = await compressImage(file)
    if (blob.size > MAX_FILE_BYTES) blob = await compressImage(file, 1000, 0.6)
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return { file: blob, kind: 'image', name, size: blob.size, mime: 'image/jpeg', previewUrl: URL.createObjectURL(blob) }
  }
  if (file.size > MAX_FILE_BYTES) throw new Error('Files are limited to 3 MB on the free plan.')
  const isImage = ['image/gif', 'image/png', 'image/jpeg', 'image/webp'].includes(file.type)
  return {
    file, kind: isImage ? 'image' : 'file', name: file.name, size: file.size,
    mime: file.type || 'application/octet-stream', previewUrl: isImage ? URL.createObjectURL(file) : null,
  }
}

/** Square avatar, 256px, as a JPEG data URL (the server stores it and serves it as an image). */
export async function avatarFromFile(file: File): Promise<string> {
  const bmp = await createImageBitmap(file)
  const side = Math.min(bmp.width, bmp.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  canvas.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 256, 256)
  return canvas.toDataURL('image/jpeg', 0.8)
}
