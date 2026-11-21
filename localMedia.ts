export const fallbackImagePath = '/media-fallback.svg'
const bundledImagePath = /^\/assets\/images\/(?:[a-z0-9._-]+\/)*[a-z0-9._-]+\.(?:jpe?g|png|svg)$/i

export function isAllowedImageReference(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const path = value.trim()
  return bundledImagePath.test(path) && !path.includes('..')
}

export function localImagePath(value: unknown): string {
  if (!isAllowedImageReference(value)) return fallbackImagePath
  return value.trim()
}
