import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore, doc, onSnapshot, setDoc, type DocumentReference } from 'firebase/firestore'
import type { InspirationTile } from './types'

/**
 * Cloud sync for the Inspirations folder. Firestore holds one document per
 * anonymous user — `inspirations/{uid}` — whose value is the whole tile array
 * plus an `updatedAt` timestamp. localStorage remains the working source of
 * truth, so the desktop (and any local edits) survive being offline; this
 * module just mirrors that array up to the cloud and folds newer cloud state
 * back down when present.
 */

export interface CloudInspDoc {
  tiles: InspirationTile[]
  updatedAt: number
}

const CFG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Without credentials the SDK is left dormant and sync is a soft no-op, so the
// app still runs fully offline in dev or before .env is filled in.
const configured = Boolean(CFG.apiKey && CFG.authDomain && CFG.projectId)

let refPromise: Promise<DocumentReference | null> | null = null
function ensureDocRef(): Promise<DocumentReference | null> {
  if (!configured) return Promise.resolve(null)
  if (!refPromise) {
    refPromise = (async () => {
      const app = initializeApp(CFG)
      const auth = getAuth(app)
      const db = getFirestore(app)
      let user = auth.currentUser
      if (!user) user = (await signInAnonymously(auth)).user
      return doc(db, 'inspirations', user.uid)
    })()
  }
  return refPromise
}

/**
 * Firestore rejects `undefined` field values (it accepts `null`). Tiles carry
 * optional fields that may be `undefined` when left empty, so strip them here
 * before they hit the wire — `null`/missing is lossless for our use.
 */
function sanitizeTile(tile: InspirationTile): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(tile)) {
    if (v !== undefined) out[k] = v
  }
  return out
}

/** Writes the whole tile array (plus timestamp) to the cloud doc. */
export async function saveCloud(docData: CloudInspDoc): Promise<void> {
  const ref = await ensureDocRef()
  if (!ref) return
  try {
    await setDoc(ref, {
      tiles: docData.tiles.map(sanitizeTile),
      updatedAt: docData.updatedAt,
    })
  } catch (e) {
    // offline or not authenticated — a local edit is never lost because
    // localStorage stays the source of truth
    console.error('[palette] cloud save failed:', e)
  }
}

/**
 * Subscribes to the cloud doc. `cb` fires with the cloud state, or `null` when
 * there is no cloud doc yet. Returns an unsubscribe function.
 */
export async function subscribeCloud(
  cb: (doc: CloudInspDoc | null) => void,
): Promise<() => void> {
  const ref = await ensureDocRef()
  if (!ref) {
    cb(null)
    return () => {}
  }
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) cb(snap.data() as CloudInspDoc)
    else cb(null)
  })
}