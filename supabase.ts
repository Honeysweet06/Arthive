import { createClient } from '@supabase/supabase-js'
import { currentFirebaseUser } from './firebaseAuth'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      accessToken: async () => {
        const user = currentFirebaseUser()
        return user ? user.getIdToken() : ''
      },
    })
  : null

export async function fetchDiscoveryData() {
  if (!supabase) return { artworks: [], literature: [], essays: [], sculptures: [], exhibitions: [], listings: [], categories: [], bestSellers: [] }

  const [artworks, literature, essays, sculptures, exhibitions, listings, categories, bestSellers] = await Promise.all([
    supabase.from('artworks').select('*, profiles:creator_id(display_name,verified,avatar_url,bio,public_profile), artwork_images(*)').eq('status', 'published').order('created_at', { ascending: false }),
    supabase.from('literature').select('*, profiles:author_id(display_name,verified,avatar_url,bio,public_profile)').eq('status', 'published').order('publication_date', { ascending: false }),
    supabase.from('essays').select('*, profiles:author_id(display_name,verified,avatar_url,bio,public_profile)').eq('status', 'published').order('publication_date', { ascending: false }),
    supabase.from('sculptures').select('*, profiles:creator_id(display_name,verified,avatar_url,bio,public_profile), sculpture_images(*)').eq('status', 'published').order('created_at', { ascending: false }),
    supabase.from('exhibitions').select('*').eq('status', 'published').order('starts_at', { ascending: false }),
    supabase.from('marketplace_listings').select('*, artworks(*, profiles:creator_id(display_name,verified,avatar_url))').in('availability', ['available', 'reserved']),
    supabase.from('categories').select('*').eq('active', true).order('sort_order'),
    supabase.rpc('get_best_sellers', { period: 'all_time', limit_count: 8 }),
  ])

  if (artworks.error || literature.error || essays.error || sculptures.error || exhibitions.error || listings.error || categories.error || bestSellers.error) {
    throw new Error(artworks.error?.message ?? literature.error?.message ?? essays.error?.message ?? sculptures.error?.message ?? exhibitions.error?.message ?? listings.error?.message ?? categories.error?.message ?? bestSellers.error?.message)
  }

  const withArtworkImages = (records: Array<Record<string, any>>) =>
    records.map((record) => ({
      ...record,
      gallery_urls: (record.artwork_images ?? []).map((image: { image_url: string }) => image.image_url),
    }))

  return {
    artworks: withArtworkImages(artworks.data ?? []),
    literature: literature.data ?? [],
    essays: essays.data ?? [],
    sculptures: sculptures.data ?? [],
    exhibitions: exhibitions.data ?? [],
    listings: listings.data ?? [],
    categories: categories.data ?? [],
    bestSellers: bestSellers.data ?? [],
  }
}
