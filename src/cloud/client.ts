// The only place in the app that creates a Supabase client.
// - Created lazily: nothing loads or runs until a cloud feature asks for the client.
// - Never throws: failures come back as a result the caller can show.
// - Stage 2 only: no sign-in, no storage, no session handling yet. Those arrive in a later, separately approved stage.
import type { SupabaseClient } from '@supabase/supabase-js'
import { readCloudConfig } from './config'
import type { CloudEnv } from './config'

export const LOAD_FAILED_MESSAGE = 'Cloud sharing could not start. Check your connection and try again.'

export type CloudClientResult =
  | { ok: true; client: SupabaseClient }
  | { ok: false; reason: 'not-configured' | 'invalid' | 'load-failed'; message: string }

let cached: SupabaseClient | null = null
let pending: Promise<CloudClientResult> | null = null

/**
 * Returns the shared Supabase client, creating it on first use.
 * Local features never call this, so a missing configuration or no internet cannot affect them.
 */
export function getCloudClient(env?: CloudEnv): Promise<CloudClientResult> {
  if (cached) return Promise.resolve({ ok: true, client: cached })
  if (pending) return pending

  const settings = readCloudConfig(env)
  if (!settings.ok) return Promise.resolve(settings)
  const { url, publishableKey } = settings.config

  pending = (async (): Promise<CloudClientResult> => {
    try {
      // Loaded on demand, so the library stays out of the code that every user downloads at start-up.
      const { createClient } = await import('@supabase/supabase-js')
      const client = createClient(url, publishableKey, {
        // Stage 2: keep the client passive. Session handling is switched on in the authentication stage.
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      })
      cached = client
      return { ok: true, client }
    } catch {
      return { ok: false, reason: 'load-failed', message: LOAD_FAILED_MESSAGE }
    } finally {
      pending = null
    }
  })()
  return pending
}

/** For tests only. */
export function resetCloudClientForTests(): void {
  cached = null
  pending = null
}
