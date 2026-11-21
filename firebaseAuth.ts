import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCustomToken,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

const accountEndpoint = import.meta.env.VITE_FIREBASE_ACCOUNT_URL as string | undefined
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId,
)

let authInstance: ReturnType<typeof getAuth> | null = null
let persistenceReady: Promise<void> | null = null

export function getFirebaseAuth() {
  if (!isFirebaseConfigured) throw new Error('Firebase Authentication is not configured.')
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp())
    persistenceReady = setPersistence(authInstance, browserLocalPersistence)
  }
  return authInstance
}

export function getFirebaseApp() {
  if (!isFirebaseConfigured) throw new Error('Firebase is not configured.')
  return getApps().length ? getApp() : initializeApp(firebaseConfig)
}

export function currentFirebaseUser(): User | null {
  return authInstance?.currentUser ?? null
}

export async function getFirebaseIdToken(user = currentFirebaseUser()) {
  if (!user) return null
  await persistenceReady
  return user.getIdToken()
}

async function requestAccount(action: 'register' | 'sync', body: Record<string, string> = {}) {
  if (!accountEndpoint) {
    throw new Error('Firebase account service is not configured. Set VITE_FIREBASE_ACCOUNT_URL.')
  }
  const response = await fetch(accountEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(action === 'sync' && currentFirebaseUser()
        ? { Authorization: `Bearer ${await getFirebaseIdToken()}` }
        : {}),
    },
    body: JSON.stringify({ action, ...body }),
  })
  const result = await response.json() as { token?: string; error?: string }
  if (!response.ok) throw new Error(result.error ?? `Account request failed (${response.status}).`)
  return result
}

export async function registerFirebaseAccount(email: string, password: string, displayName: string) {
  const auth = getFirebaseAuth()
  await persistenceReady
  const result = await requestAccount('register', { email, password, displayName })
  if (!result.token) throw new Error('Account service did not return a Firebase sign-in token.')
  const credential = await signInWithCustomToken(auth, result.token)
  await sendEmailVerification(credential.user)
  return credential.user
}

export async function signInFirebaseAccount(email: string, password: string) {
  const auth = getFirebaseAuth()
  await persistenceReady
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user
}

export async function synchronizeFirebaseAccount(user = currentFirebaseUser()) {
  if (!user) throw new Error('Sign in before synchronizing your ArtHive account.')
  await reload(user)
  if (!user.emailVerified) throw new Error('Verify your email address before accessing your ArtHive account.')
  await requestAccount('sync')
}

export async function resendFirebaseVerification(user = currentFirebaseUser()) {
  if (!user) throw new Error('Sign in to request another verification email.')
  await reload(user)
  if (user.emailVerified) {
    await synchronizeFirebaseAccount(user)
    return
  }
  await sendEmailVerification(user)
}

export async function resetFirebasePassword(email: string) {
  const auth = getFirebaseAuth()
  await persistenceReady
  await sendPasswordResetEmail(auth, email)
}

export async function signOutFirebaseAccount() {
  await signOut(getFirebaseAuth())
}

export async function observeFirebaseAuth(callback: (user: User | null) => void) {
  const auth = getFirebaseAuth()
  await persistenceReady
  return onAuthStateChanged(auth, callback)
}
