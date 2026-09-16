const STORAGE_KEY = 'vouch:saved-workers'

// Per-device only — there's no account to attach a saved list to, so this
// never leaves localStorage and never reaches the server. Exposed through
// useSyncExternalStore (see the listener set below) rather than a
// read-in-useEffect + setState pattern, since localStorage is exactly the
// kind of external mutable store that hook exists for.
type Listener = () => void
const listeners = new Set<Listener>()

function readIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function isWorkerSaved(id: string): boolean {
  return readIds().includes(id)
}

/** Flips the saved state for this worker and returns the new state. */
export function toggleWorkerSaved(id: string): boolean {
  const ids = readIds()
  const idx = ids.indexOf(id)
  const nowSaved = idx < 0
  if (nowSaved) {
    ids.push(id)
  } else {
    ids.splice(idx, 1)
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // Private browsing / storage disabled — the toggle just won't persist.
  }
  listeners.forEach((listener) => listener())
  return nowSaved
}

export function subscribeSavedWorkers(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
