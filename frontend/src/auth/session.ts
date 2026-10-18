import { useSyncExternalStore } from 'react'

export type Role = 'CITIZEN' | 'AUTHORITY'
export type User = { id: string; email: string; role: Role }
type Session = { user: User | null; expiresAt: string | null; generation: number }
type StoredSession = { accessToken: string; user: User; expiresAt: string }
const STORAGE_KEY = 'gdrn.session'

function storage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function isUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<User>
  return typeof candidate.id === 'string' && typeof candidate.email === 'string'
    && (candidate.role === 'CITIZEN' || candidate.role === 'AUTHORITY')
}

function readStoredSession(): StoredSession | null {
  const currentStorage = storage()
  if (!currentStorage) return null
  try {
    const raw = currentStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const candidate = JSON.parse(raw) as Partial<StoredSession>
    const expiresAt = candidate.expiresAt
    if (typeof candidate.accessToken !== 'string' || !candidate.accessToken
      || !isUser(candidate.user) || typeof expiresAt !== 'string'
      || !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now()) {
      currentStorage.removeItem(STORAGE_KEY)
      return null
    }
    return { accessToken: candidate.accessToken, user: candidate.user, expiresAt }
  } catch {
    try { currentStorage.removeItem(STORAGE_KEY) } catch { /* storage can be unavailable */ }
    return null
  }
}

const restored = readStoredSession()
let state: Session = restored
  ? { user: restored.user, expiresAt: restored.expiresAt, generation: 0 }
  : { user: null, expiresAt: null, generation: 0 }
let token: string | null = restored?.accessToken ?? null
let expiration: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()
const cleanups = new Set<() => void>()

function scheduleExpiration(expiresAt: string) {
  clearTimeout(expiration)
  expiration = setTimeout(() => session.clear(), Date.parse(expiresAt) - Date.now())
}

function persist(currentToken: string, user: User, expiresAt: string) {
  try { storage()?.setItem(STORAGE_KEY, JSON.stringify({ accessToken: currentToken, user, expiresAt })) } catch { /* memory session remains usable */ }
}

if (restored) scheduleExpiration(restored.expiresAt)

export const session = {
  snapshot: () => state,
  token: () => token,
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
  // Feature owners register cleanup for any per-user cache outside mounted components.
  onClear(cleanup: () => void) { cleanups.add(cleanup); return () => { cleanups.delete(cleanup) } },
  clear() {
    clearTimeout(expiration)
    token = null
    state = { user: null, expiresAt: null, generation: state.generation + 1 }
    try { storage()?.removeItem(STORAGE_KEY) } catch { /* storage can be unavailable */ }
    for (const cleanup of cleanups) cleanup()
    for (const listener of listeners) listener()
  },
  establish(accessToken: string, user: User, expiresAt: string, generation: number) {
    if (generation !== state.generation) return false
    const remaining = Date.parse(expiresAt) - Date.now()
    if (!Number.isFinite(remaining) || remaining <= 0) return false
    token = accessToken
    state = { ...state, user, expiresAt }
    persist(accessToken, user, expiresAt)
    scheduleExpiration(expiresAt)
    for (const listener of listeners) listener()
    return true
  },
}

export function useSession() {
  return useSyncExternalStore(session.subscribe, session.snapshot)
}
