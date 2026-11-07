import type { Attachment } from './types'

export const MAX_FILE_BYTES = 700 * 1024 // Firestore documents are capped at 1 MiB

const readAsDataUrl = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })

/** Downscales an image to fit inside max×max and returns a JPEG data URL. */
export async function compressImage(file: File, max = 1280, quality = 0.72): Promise<string> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

export async function fileToAttachment(file: File): Promise<Attachment> {
  if (file.type.startsWith('image/') && file.type !== 'image/gif') {
    let dataUrl = await compressImage(file)
    if (dataUrl.length > MAX_FILE_BYTES * 1.37) dataUrl = await compressImage(file, 800, 0.6)
    return { kind: 'image', name: file.name, size: file.size, mime: 'image/jpeg', dataUrl }
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Files are limited to 700 KB on the free plan (Firebase Storage needs a paid plan).')
  }
  return {
    kind: file.type.startsWith('image/') ? 'image' : 'file',
    name: file.name, size: file.size, mime: file.type || 'application/octet-stream',
    dataUrl: await readAsDataUrl(file),
  }
}

/** Square avatar, 256px. */
export async function avatarFromFile(file: File): Promise<string> {
  const bmp = await createImageBitmap(file)
  const side = Math.min(bmp.width, bmp.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  canvas.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 256, 256)
  return canvas.toDataURL('image/jpeg', 0.8)
}
