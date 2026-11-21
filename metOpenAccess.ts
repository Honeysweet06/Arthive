import { isAllowedImageReference } from './localMedia'

export type MetOpenAccessGroup =
  | 'paintings'
  | 'drawings'
  | 'sculptures'
  | 'traditional-cultural'
  | 'photography-decorative'

export type MetOpenAccessRecord = {
  id: number
  metObjectID: number
  group: MetOpenAccessGroup
  title: string
  artist: string
  artistRole: string
  artistPrefix: string
  artistBio: string
  objectDate: string
  medium: string
  dimensions: string
  department: string
  classification: string
  objectName: string
  culture: string
  period: string
  country: string
  region: string
  description: string | null
  tags: string[]
  objectURL: string
  originalImageURL: string
  additionalImageURLs: string[]
  openAccess: boolean
  isPublicDomain: boolean
  isHighlight?: boolean
  license: string
  licenseURL: string
  openAccessSource: string
  creditLine: string
  localImage: string
}

const manifestPath = '/assets/images/artworks/met-collection/metadata.json'
const allowedGroups: MetOpenAccessGroup[] = [
  'paintings',
  'drawings',
  'sculptures',
  'traditional-cultural',
  'photography-decorative',
]
const expectedGroupCounts: Record<MetOpenAccessGroup, number> = {
  paintings: 8,
  drawings: 4,
  sculptures: 4,
  'traditional-cultural': 4,
  'photography-decorative': 4,
}

function isMetOpenAccessRecord(value: unknown): value is MetOpenAccessRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<MetOpenAccessRecord>
  return Number.isSafeInteger(record.id)
    && Number.isSafeInteger(record.metObjectID)
    && typeof record.group === 'string'
    && allowedGroups.includes(record.group as MetOpenAccessGroup)
    && typeof record.title === 'string'
    && typeof record.artist === 'string'
    && typeof record.objectURL === 'string'
    && record.objectURL.startsWith('https://www.metmuseum.org/art/collection/')
    && typeof record.originalImageURL === 'string'
    && /^https:\/\/images\.metmuseum\.org\/.+\.jpg$/i.test(record.originalImageURL)
    && record.openAccess === true
    && record.isPublicDomain === true
    && record.license === 'CC0 1.0'
    && typeof record.licenseURL === 'string'
    && typeof record.openAccessSource === 'string'
    && isAllowedImageReference(record.localImage)
    && record.localImage.startsWith('/assets/images/artworks/met-collection/')
    && Array.isArray(record.tags)
    && record.tags.every((tag) => typeof tag === 'string')
}

export async function fetchMetOpenAccessRecords(): Promise<MetOpenAccessRecord[]> {
  const response = await fetch(manifestPath)
  if (!response.ok) {
    throw new Error(`The local Met Open Access collection could not be loaded (${response.status}).`)
  }

  const content: unknown = await response.json()
  if (!Array.isArray(content) || content.length !== 24 || !content.every(isMetOpenAccessRecord)) {
    throw new Error('The local Met Open Access manifest must contain exactly 24 valid, CC0 public-domain records.')
  }

  const records = content as MetOpenAccessRecord[]
  if (new Set(records.map((record) => record.metObjectID)).size !== 24
    || new Set(records.map((record) => record.localImage)).size !== 24) {
    throw new Error('The local Met Open Access manifest contains duplicate object IDs or image paths.')
  }
  const counts = records.reduce<Record<string, number>>((result, record) => {
    result[record.group] = (result[record.group] ?? 0) + 1
    return result
  }, {})
  if (Object.entries(expectedGroupCounts).some(([group, count]) => counts[group] !== count)) {
    throw new Error('The local Met Open Access manifest does not match the required 8/4/4/4/4 collection breakdown.')
  }
  return records
}
