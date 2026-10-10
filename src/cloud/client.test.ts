import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn(() => ({ fake: true })) }))
vi.mock('@supabase/supabase-js', () => ({ createClient }))

import { getCloudClient, resetCloudClientForTests } from './client'

const GOOD = {
  VITE_SUPABASE_URL: 'https://abcdefghij.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abcdefghijklmnopqrstuvwxyz123456'
}

beforeEach(() => {
  resetCloudClientForTests()
  createClient.mockClear()
  createClient.mockImplementation(() => ({ fake: true }))
})

describe('getCloudClient', () => {
  it('does not load or create anything when configuration is missing', async () => {
    const r = await getCloudClient({})
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).toBe('not-configured')
      expect(r.message).toBe('Cloud sharing is not set up.')
    }
    expect(createClient).not.toHaveBeenCalled()
  })

  it('creates one passive client and reuses it', async () => {
    const a = await getCloudClient(GOOD)
    const b = await getCloudClient(GOOD)
    expect(a.ok && b.ok).toBe(true)
    if (a.ok && b.ok) expect(a.client).toBe(b.client)
    expect(createClient).toHaveBeenCalledTimes(1)
    const calls = createClient.mock.calls as unknown as unknown[][]
    expect(calls[0][0]).toBe(GOOD.VITE_SUPABASE_URL)
    expect(calls[0][1]).toBe(GOOD.VITE_SUPABASE_PUBLISHABLE_KEY)
    expect(calls[0][2]).toEqual({ auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  })

  it('shares one creation between simultaneous callers', async () => {
    const [a, b] = await Promise.all([getCloudClient(GOOD), getCloudClient(GOOD)])
    expect(a.ok && b.ok).toBe(true)
    expect(createClient).toHaveBeenCalledTimes(1)
  })

  it('reports a failure instead of throwing, and can try again later', async () => {
    createClient.mockImplementationOnce(() => {
      throw new Error('boom')
    })
    const failed = await getCloudClient(GOOD)
    expect(failed.ok).toBe(false)
    if (!failed.ok) expect(failed.reason).toBe('load-failed')
    const retried = await getCloudClient(GOOD)
    expect(retried.ok).toBe(true)
  })
})
