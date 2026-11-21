const storageKey = 'arthive:favorites:v1'

export type FavoriteArtwork = {
  id: string
  title: string
  artist: string
  category: string
  image: string
  metObjectID?: number
}

function readFavorites(): FavoriteArtwork[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is FavoriteArtwork =>
      !!item && typeof item === 'object'
      && typeof (item as FavoriteArtwork).id === 'string'
      && typeof (item as FavoriteArtwork).title === 'string'
      && typeof (item as FavoriteArtwork).image === 'string') : []
  } catch {
    return []
  }
}

function writeFavorites(items: FavoriteArtwork[]) {
  localStorage.setItem(storageKey, JSON.stringify(items))
}

export function getFavorites(): FavoriteArtwork[] {
  return readFavorites()
}

export function isFavorite(id: string): boolean {
  return readFavorites().some((item) => item.id === id)
}

export function toggleFavorite(item: FavoriteArtwork): boolean {
  const favorites = readFavorites()
  const exists = favorites.some((favorite) => favorite.id === item.id)
  writeFavorites(exists ? favorites.filter((favorite) => favorite.id !== item.id) : [...favorites, item])
  return !exists
}
