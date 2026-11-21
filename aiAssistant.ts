import { supabase } from './supabase'
import { currentFirebaseUser, getFirebaseIdToken } from './firebaseAuth'

export type AssistantResult = {
  id: string
  collection: string
  title: string
  creator: string
  category: string
  description: string
  image: string | null
  price?: number
  currency?: string
  availability?: string
  verified?: boolean
  href: string
}

export type AssistantMessage = {
  role: 'user' | 'assistant'
  content: string
  created_at?: string
  id?: number
  results?: AssistantResult[]
}

const endpoint = import.meta.env.VITE_ART_HIVE_AI_URL as string | undefined

async function requestAssistant<T>(body: Record<string, unknown>): Promise<T> {
  if (!endpoint) throw new Error('ArtHive AI endpoint is not configured. Add VITE_ART_HIVE_AI_URL after deploying the assistant function.')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (currentFirebaseUser()?.emailVerified) {
    const token = await getFirebaseIdToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) })
  const result = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(result.error ?? `ArtHive AI request failed (${response.status}).`)
  return result
}

export const loadAssistantConfig = () =>
  requestAssistant<{
    enabled: boolean
    configured: boolean
    welcomeMessage: string
    suggestedQuestions: string[]
    contact: Array<{ label: string; value: string; channel: string }>
    isAdmin: boolean
    model?: string
    maxRequestsPerHour?: number
  }>({ action: 'config' })

export const sendAssistantMessage = (
  message: string,
  sessionId: string,
  history: AssistantMessage[],
) => requestAssistant<{
  answer: string
  results: AssistantResult[]
  sessionId: string | null
  messageId: number | null
}>({
  action: 'send',
  message,
  sessionId,
  history: history.slice(-6).map(({ role, content }) => ({ role, content })),
})

export const loadAssistantSessions = () =>
  requestAssistant<{ sessions: Array<{ id: string; title: string; updated_at: string }> }>({ action: 'sessions' })

export const loadAssistantHistory = (sessionId: string) =>
  requestAssistant<{ messages: AssistantMessage[] }>({ action: 'history', sessionId })

export const sendAssistantFeedback = (messageId: number, rating: number) =>
  requestAssistant<{ ok: boolean }>({ action: 'feedback', messageId, rating })

export const submitSupportRequest = (subject: string, message: string) =>
  requestAssistant<{ requestId: number }>({ action: 'support', subject, message })

export async function saveAssistantSettings(settings: {
  enabled: boolean
  welcome_message: string
  suggested_questions: string[]
  model: string
  max_requests_per_hour: number
}) {
  if (!supabase) throw new Error('Supabase is not configured.')
  if (!currentFirebaseUser()?.emailVerified) throw new Error('Sign in with a verified administrator account to configure ArtHive AI.')
  const { error } = await supabase.from('ai_assistant_settings')
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq('id', 1)
  if (error) throw error
}
