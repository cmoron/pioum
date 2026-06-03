import fs from 'node:fs'
import path from 'node:path'

/**
 * Root directory for user-uploaded files. Backed by a Docker volume in
 * staging/prod so uploads survive container recreation. Defaults to ./uploads
 * (relative to the backend process cwd) in development.
 */
export const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || 'uploads')
export const AVATAR_UPLOADS_DIR = path.join(UPLOADS_DIR, 'avatars')

/** Allowed avatar image types → mapped from the multipart mimetype. */
export const ALLOWED_AVATAR_MIME = new Set(['image/webp', 'image/png', 'image/jpeg'])

/** Max uploaded avatar size in bytes (2 MiB). */
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024

/** URL prefix under which uploaded avatars are served (extension-less on purpose). */
export const AVATAR_FILE_URL_PREFIX = '/api/avatars/files/'

export function ensureUploadDirs(): void {
  fs.mkdirSync(AVATAR_UPLOADS_DIR, { recursive: true })
}

/** Build the public, extension-less URL for a stored avatar file key. */
export function avatarFileUrl(key: string): string {
  return `${AVATAR_FILE_URL_PREFIX}${key}`
}

/**
 * If `imageUrl` points to an uploaded file, return its on-disk path; otherwise null.
 * Used to delete the binary when an avatar is removed or its image replaced.
 * Returns null for seeded avatars (static `/avatars/...` paths) and for any key
 * that isn't a plain slug, guarding against path traversal.
 */
export function uploadedFilePath(imageUrl: string | null | undefined): string | null {
  if (!imageUrl || !imageUrl.startsWith(AVATAR_FILE_URL_PREFIX)) return null
  const key = imageUrl.slice(AVATAR_FILE_URL_PREFIX.length)
  if (!/^[A-Za-z0-9_-]+$/.test(key)) return null
  return path.join(AVATAR_UPLOADS_DIR, key)
}

/** Best-effort deletion of an uploaded avatar binary; never throws. */
export async function deleteUploadedAvatar(imageUrl: string | null | undefined): Promise<void> {
  const filePath = uploadedFilePath(imageUrl)
  if (!filePath) return
  await fs.promises.unlink(filePath).catch(() => {})
}
