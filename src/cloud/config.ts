// Cloud (Supabase) configuration.
// Pure functions only: nothing in this file touches the network, storage or the Supabase library.

export const NOT_SET_UP_MESSAGE = 'Cloud sharing is not set up.'
export const INVALID_CONFIG_MESSAGE = 'Cloud sharing settings look wrong. Please check them.'
export const PRIVATE_KEY_MESSAGE =
  'Cloud sharing cannot start: a private key was found where only a publishable key belongs.'

export interface CloudConfig {
  /** Project origin, for example https://abcd1234.supabase.co (no path, no trailing slash) */
  url: string
  /** Publishable key. Public by design. */
  publishableKey: string
}

export type ConfigResult =
  | { ok: true; config: CloudConfig }
  | { ok: false; reason: 'not-configured' | 'invalid'; message: string }

/** The two settings, as Vite provides them. Anything may be missing or the wrong type. */
export interface CloudEnv {
  VITE_SUPABASE_URL?: unknown
  VITE_SUPABASE_PUBLISHABLE_KEY?: unknown
}

const clean = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

// Values copied straight from .env.example count as "not set up", not as an error.
const isPlaceholder = (value: string): boolean => /YOUR[-_]PROJECT[-_]REF|YOUR[-_]KEY[-_]HERE/i.test(value)

const invalid = (message = INVALID_CONFIG_MESSAGE): ConfigResult => ({ ok: false, reason: 'invalid', message })

function decodeBase64Url(part: string): string | null {
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    return atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
  } catch {
    return null
  }
}

/** Reads only the role claim of a legacy key. Never verifies or stores it. */
function legacyKeyRole(key: string): string | null {
  const parts = key.split('.')
  if (parts.length !== 3) return null
  const json = decodeBase64Url(parts[1])
  if (!json) return null
  try {
    const role = (JSON.parse(json) as { role?: unknown }).role
    return typeof role === 'string' ? role : null
  } catch {
    return null
  }
}

/**
 * Validates the cloud settings. Never throws.
 * Pass an env object in tests; the app uses the default (Vite's import.meta.env).
 */
export function readCloudConfig(env: CloudEnv | undefined = import.meta.env): ConfigResult {
  const source: CloudEnv = env ?? {}
  const rawUrl = clean(source.VITE_SUPABASE_URL)
  const rawKey = clean(source.VITE_SUPABASE_PUBLISHABLE_KEY)

  if (!rawUrl || !rawKey || isPlaceholder(rawUrl) || isPlaceholder(rawKey)) {
    return { ok: false, reason: 'not-configured', message: NOT_SET_UP_MESSAGE }
  }

  // ---- URL: https (http only for local development), origin only, no credentials ----
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return invalid()
  }
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (!(url.protocol === 'https:' || (url.protocol === 'http:' && isLocal))) return invalid()
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return invalid()

  // ---- Key: publishable only. Refuse anything that looks like a private key. ----
  if (/\s/.test(rawKey) || rawKey.length < 20 || rawKey.length > 4096) return invalid()
  if (rawKey.startsWith('sb_secret_')) return invalid(PRIVATE_KEY_MESSAGE)

  if (rawKey.startsWith('sb_publishable_')) {
    // the part after the prefix must be a real-looking token, not a few letters
    if (!/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(rawKey)) return invalid()
    return { ok: true, config: { url: url.origin, publishableKey: rawKey } }
  }
  if (rawKey.startsWith('eyJ')) {
    // legacy "anon" key: a JWT. Only the anon role is acceptable in a browser.
    const role = legacyKeyRole(rawKey)
    if (role === 'service_role') return invalid(PRIVATE_KEY_MESSAGE)
    if (role === 'anon') return { ok: true, config: { url: url.origin, publishableKey: rawKey } }
  }
  return invalid()
}

/** True when both settings are present and valid. */
export function isCloudConfigured(env?: CloudEnv): boolean {
  return readCloudConfig(env).ok
}
