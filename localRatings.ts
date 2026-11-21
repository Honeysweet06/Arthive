const storageKey = 'arthive:visitor-ratings:v1'
const ratingWindowMs = 60 * 60 * 1000
const maximumRatingsPerHour = 10

type StoredRating = {
  rating: number
  createdAt: number
}

type RatingStore = {
  ratings: Record<string, StoredRating>
  submissions: number[]
}

export type LocalRatingSummary = {
  average: number | null
  count: number
  distribution: number[]
  userRating: number | null
}

function readStore(): RatingStore {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return { ratings: {}, submissions: [] }

  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new Error('Saved local ratings could not be read. Clear this browser’s ArtHive rating data to continue.')
  }
  if (!value || typeof value !== 'object' || !('ratings' in value) || !('submissions' in value)) {
    throw new Error('Saved local ratings have an invalid format.')
  }
  const candidate = value as { ratings: unknown; submissions: unknown }
  if (!candidate.ratings || typeof candidate.ratings !== 'object' || Array.isArray(candidate.ratings)
    || !Array.isArray(candidate.submissions)) {
    throw new Error('Saved local ratings have an invalid format.')
  }
  const ratings: RatingStore['ratings'] = {}
  for (const [key, stored] of Object.entries(candidate.ratings)) {
    if (!stored || typeof stored !== 'object') throw new Error('Saved local ratings have an invalid format.')
    const entry = stored as Partial<StoredRating>
    if (!Number.isInteger(entry.rating) || Number(entry.rating) < 1 || Number(entry.rating) > 5
      || !Number.isFinite(entry.createdAt)) {
      throw new Error('Saved local ratings have an invalid format.')
    }
    ratings[key] = { rating: Number(entry.rating), createdAt: Number(entry.createdAt) }
  }
  if (!candidate.submissions.every((timestamp) => Number.isFinite(timestamp))) {
    throw new Error('Saved local ratings have an invalid format.')
  }
  return { ratings, submissions: candidate.submissions as number[] }
}

export function getLocalRatingSummary(itemKey: string): LocalRatingSummary {
  const rating = readStore().ratings[itemKey]?.rating
  const distribution = [0, 0, 0, 0, 0]
  if (rating && Number.isInteger(rating) && rating >= 1 && rating <= 5) distribution[rating - 1] = 1
  return {
    average: rating && Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
    count: rating && Number.isInteger(rating) && rating >= 1 && rating <= 5 ? 1 : 0,
    distribution,
    userRating: rating ?? null,
  }
}

export function submitLocalRating(itemKey: string, rating: number): LocalRatingSummary {
  if (!itemKey.trim()) throw new Error('A valid artwork key is required.')
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Choose a rating from 1 to 5 stars.')

  const store = readStore()
  if (store.ratings[itemKey]) throw new Error('This browser has already rated this item.')

  const now = Date.now()
  store.submissions = store.submissions.filter((timestamp) => Number.isFinite(timestamp) && now - timestamp < ratingWindowMs)
  if (store.submissions.length >= maximumRatingsPerHour) {
    throw new Error('This browser has reached the local rating limit. Try again later.')
  }

  store.ratings[itemKey] = { rating, createdAt: now }
  store.submissions.push(now)
  localStorage.setItem(storageKey, JSON.stringify(store))
  return getLocalRatingSummary(itemKey)
}
