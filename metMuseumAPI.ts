const baseURL = 'https://collectionapi.metmuseum.org/public/collection/v1'
const searchURL = 'https://collectionapi.metmuseum.org/public/collection/v1.1/search'

type MetObject = {
  objectID: number
  title?: string
  artistDisplayName?: string
  objectDate?: string
  medium?: string
  culture?: string
  department?: string
  dimensions?: string
  primaryImage?: string
  primaryImageSmall?: string
  additionalImages?: string[]
  objectURL?: string
  isPublicDomain?: boolean
  isHighlight?: boolean
  creditLine?: string
  period?: string
}

const cache = new Map<string, unknown>()

function readCache<T>(key: string): T | undefined {
  if (cache.has(key)) return cache.get(key) as T
  try {
    const stored = localStorage.getItem(`arthive:met:${key}`)
    if (stored) {
      const value = JSON.parse(stored) as T
      cache.set(key, value)
      return value
    }
  } catch {
    // The API remains usable when local storage is unavailable or malformed.
  }
  return undefined
}

function writeCache(key: string, value: unknown) {
  cache.set(key, value)
  try {
    localStorage.setItem(`arthive:met:${key}`, JSON.stringify(value))
  } catch {
    // Caching is an optimization, not a requirement.
  }
}

export async function searchMetObjects(query: string, limit = 40): Promise<number[]> {
  const key = `search:${query}:${limit}`
  const cached = readCache<number[]>(key)
  if (cached) return cached
  const url = new URL(searchURL)
  url.searchParams.set('q', query)
  url.searchParams.set('hasImages', 'true')
  const response = await fetch(url)
  if (!response.ok) throw new Error(`The Met search request failed (${response.status}).`)
  const data = await response.json() as { objectIDs?: number[] }
  const ids = (data.objectIDs ?? []).slice(0, limit)
  writeCache(key, ids)
  return ids
}

export async function getMetObject(objectID: number): Promise<MetObject | null> {
  const key = `object:${objectID}`
  const cached = readCache<MetObject>(key)
  if (cached) return cached
  const response = await fetch(`${baseURL}/objects/${objectID}`)
  if (!response.ok) throw new Error(`The Met object request failed (${response.status}).`)
  const object = await response.json() as MetObject
  if (!object.isPublicDomain || !(object.primaryImageSmall || object.primaryImage)) return null
  writeCache(key, object)
  return object
}

export async function fetchMetObjects(query: string, limit = 40): Promise<MetObject[]> {
  const ids = await searchMetObjects(query, limit)
  const records: MetObject[] = []
  for (let index = 0; index < ids.length; index += 8) {
    const batch = await Promise.all(ids.slice(index, index + 8).map(async (id) => {
      try {
        return await getMetObject(id)
      } catch {
        return null
      }
    }))
    records.push(...batch.filter((record): record is MetObject => record !== null))
  }
  return records
}
