import { supabase } from './supabase'
import { currentFirebaseUser } from './firebaseAuth'

export type FounderProfile = {
  id: number
  full_name: string
  title: string
  university: string
  education: string
  biography: string
  founder_story: string
  interests: string[]
  aspirations: string[]
  vision: string
  mission: string
  statements_approved: boolean
  profile_image_path: string | null
}

export type FounderSkill = {
  slug: string
  name: string
  status: string
  category: string
}

export type FounderProject = {
  id: string
  slug: string
  title: string
  description: string
  category: string
  role: string
  technologies: string[]
  status: 'concept' | 'prototype' | 'functional'
  sort_order: number
  image: string | null
  image_path: string | null
}

export type FounderContact = {
  key: string
  label: string
  channel: string
  value: string
  sort_order: number
}

export type FounderContent = {
  profile: FounderProfile
  profileImage: string | null
  skills: FounderSkill[]
  projects: FounderProject[]
  contacts: FounderContact[]
  canManage: boolean
  configured: boolean
}

const defaultProfile: FounderProfile = {
  id: 1,
  full_name: 'Honeylyn A. Moreno',
  title: 'Founder and Owner of ArtHive Digital Museum',
  university: 'Samar State University, Philippines',
  education: 'Bachelor of Science in Information Technology student',
  biography: 'Honeylyn A. Moreno is an Information Technology student and aspiring digital innovator interested in combining technology, creativity, and continuous learning. She is exploring web and application development, digital tools, and artificial intelligence while appreciating how arts, literature, and cultural heritage bring people together.',
  founder_story: 'ArtHive was conceptualized as a digital experience that brings art, literature, cultural expression, and technology together. Honeylyn hopes to make space for artists to showcase works, writers to share publications, and visitors to discover creative collections. The concept also imagines easier connections between creators and collectors, and greater access to artistic and cultural expression. ArtHive remains a work in progress as its ideas and features continue to develop.',
  interests: ['Digital technology', 'Web development', 'Artificial intelligence', 'Software and application development', 'Digital innovation', 'Responsive web design', 'Online research and documentation', 'Continuous learning'],
  aspirations: ['Virtual assistance', 'Data entry and data organization', 'Online research', 'Technical documentation', 'AI response evaluation'],
  vision: 'To contribute to a digitally connected world where creativity, culture, knowledge, and technology work together to create meaningful opportunities for individuals and communities.',
  mission: 'To continuously learn, innovate, and develop digital solutions that empower creative individuals, promote cultural appreciation, and make knowledge and creative works more accessible.',
  statements_approved: false,
  profile_image_path: null,
}

const defaultSkills: FounderSkill[] = [
  { slug: 'html', name: 'HTML', status: 'Developing', category: 'Web development' },
  { slug: 'css', name: 'CSS', status: 'Developing', category: 'Web development' },
  { slug: 'javascript', name: 'JavaScript', status: 'Learning', category: 'Web development' },
  { slug: 'responsive-design', name: 'Responsive design', status: 'Practicing', category: 'Design' },
  { slug: 'online-research', name: 'Online research', status: 'Practicing', category: 'Research' },
  { slug: 'documentation', name: 'Documentation', status: 'Practicing', category: 'Communication' },
  { slug: 'digital-tools', name: 'Digital tools', status: 'Developing', category: 'Digital skills' },
  { slug: 'ai-assisted-projects', name: 'AI-assisted projects', status: 'Exploring', category: 'Emerging technology' },
]

const defaultProjects: FounderProject[] = [
  {
    id: 'arthive-digital-museum', slug: 'arthive-digital-museum', title: 'ArtHive Digital Museum',
    description: 'A digital museum and creative marketplace concept for artworks, literature, essays, sculptures, creators, and cultural preservation, with AI-assisted discovery and marketplace features.',
    category: 'Art and culture', role: 'Founder; concept and development',
    technologies: [], status: 'concept', sort_order: 1, image: null, image_path: null,
  },
  {
    id: 'honeybunch-sweet-delicacy', slug: 'honeybunch-sweet-delicacy', title: 'Honeybunch Sweet Delicacy',
    description: 'A food business and e-commerce website concept focused on presenting products and supporting online browsing and ordering.',
    category: 'Food and e-commerce', role: 'Project concept',
    technologies: [], status: 'concept', sort_order: 2, image: null, image_path: null,
  },
  {
    id: 'feed-emergency-assistance', slug: 'feed-emergency-assistance', title: 'FEED',
    description: 'An emergency food assistance and distribution system concept focused on coordinating community support during disasters.',
    category: 'Community assistance', role: 'Project concept',
    technologies: [], status: 'concept', sort_order: 3, image: null, image_path: null,
  },
]

const defaultContacts: FounderContact[] = [
  { key: 'email', label: 'Email', channel: 'email', value: 'morenohoneylyn73@gmail.com', sort_order: 1 },
  { key: 'linkedin', label: 'LinkedIn', channel: 'website', value: 'https://linkedin.com/in/honeylyn-araneta408509328', sort_order: 2 },
  { key: 'github', label: 'GitHub', channel: 'website', value: 'https://github.com/Honeysweet06', sort_order: 3 },
  { key: 'facebook', label: 'Facebook', channel: 'website', value: 'https://www.facebook.com/moreno.honeylyn.63', sort_order: 4 },
  { key: 'portfolio', label: 'Personal portfolio', channel: 'website', value: 'https://personalportfolio-kohl-zeta.vercel.app/', sort_order: 5 },
]

export const portfolioUrl = 'https://personalportfolio-kohl-zeta.vercel.app/'

export async function loadFounderContent(): Promise<FounderContent> {
  if (!supabase) {
    return {
      profile: defaultProfile,
      profileImage: null,
      skills: defaultSkills,
      projects: defaultProjects,
      contacts: defaultContacts,
      canManage: false,
      configured: false,
    }
  }

  const [profileResult, skillsResult, projectsResult, contactsResult, canManageResult] = await Promise.all([
    supabase.from('founder_profiles').select('*').eq('id', 1).maybeSingle(),
    supabase.from('founder_skills').select('slug,name,status,category').eq('active', true).order('sort_order'),
    supabase.from('founder_projects').select('slug,title,description,category,role,technologies,status,sort_order,image_path').eq('active', true).order('sort_order'),
    supabase.from('founder_contacts').select('key,label,channel,value,sort_order').eq('active', true).order('sort_order'),
    supabase.rpc('current_user_can_manage_founder'),
  ])
  const failure = profileResult.error ?? skillsResult.error ?? projectsResult.error ?? contactsResult.error
  if (failure) throw new Error(`Founder profile could not be loaded: ${failure.message}`)
  if (!profileResult.data) throw new Error('Founder profile record is missing. Apply the founder profile section in supabase/schema.sql.')
  if (canManageResult.error) throw new Error(`Founder permissions could not be checked: ${canManageResult.error.message}`)
  const canManage = canManageResult.data === true
  return {
    profile: profileResult.data as FounderProfile,
    profileImage: profileResult.data.profile_image_path,
    skills: skillsResult.data ?? [],
    projects: (projectsResult.data ?? []).map((project) => ({
      ...project,
      id: project.slug,
      technologies: project.technologies ?? [],
      image: project.image_path ?? null,
    })),
    contacts: contactsResult.data ?? [],
    canManage,
    configured: true,
  }
}

export async function saveFounderProfile(profile: Partial<FounderProfile>) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const user = currentFirebaseUser()
  if (!user?.emailVerified) throw new Error('Sign in with a verified Firebase account to edit this profile.')
  const payload = { ...profile, updated_at: new Date().toISOString() }
  const { error } = await supabase.from('founder_profiles').update(payload).eq('id', 1)
  if (error) throw new Error(`Founder profile could not be saved: ${error.message}`)
}

export async function saveFounderSkills(skills: Array<Pick<FounderSkill, 'slug' | 'name' | 'status' | 'category'>>) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('founder_skills').upsert(
    skills.map((skill, index) => ({ ...skill, sort_order: index + 1, active: true })),
    { onConflict: 'slug' },
  )
  if (error) throw new Error(`Founder skills could not be saved: ${error.message}`)
  const activeSlugs = skills.map((skill) => skill.slug)
  const deactivateQuery = supabase.from('founder_skills').update({ active: false })
  const { error: deactivateError } = activeSlugs.length
    ? await deactivateQuery.not('slug', 'in', `(${activeSlugs.join(',')})`)
    : await deactivateQuery
  if (deactivateError) throw new Error(`Removed skills could not be deactivated: ${deactivateError.message}`)
}

export async function saveFounderProjects(projects: Array<Pick<FounderProject, 'slug' | 'title' | 'description' | 'category' | 'role' | 'technologies' | 'status' | 'image_path'>>) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('founder_projects').upsert(
    projects.map((project, index) => ({ ...project, sort_order: index + 1, active: true })),
    { onConflict: 'slug' },
  )
  if (error) throw new Error(`Founder projects could not be saved: ${error.message}`)
  const slugs = projects.map((project) => project.slug)
  const deactivateQuery = supabase.from('founder_projects').update({ active: false })
  const { error: deactivateError } = slugs.length
    ? await deactivateQuery.not('slug', 'in', `(${slugs.join(',')})`)
    : await deactivateQuery
  if (deactivateError) throw new Error(`Removed projects could not be archived: ${deactivateError.message}`)
}

export async function saveFounderContacts(contacts: Array<Pick<FounderContact, 'key' | 'label' | 'channel' | 'value'>>) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('founder_contacts').upsert(
    contacts.map((contact, index) => ({ ...contact, sort_order: index + 1, active: true })),
    { onConflict: 'key' },
  )
  if (error) throw new Error(`Founder contacts could not be saved: ${error.message}`)
  const keys = contacts.map((contact) => contact.key)
  const deactivateQuery = supabase.from('founder_contacts').update({ active: false })
  const { error: deactivateError } = keys.length
    ? await deactivateQuery.not('key', 'in', `(${keys.join(',')})`)
    : await deactivateQuery
  if (deactivateError) throw new Error(`Removed contact links could not be deactivated: ${deactivateError.message}`)
}
