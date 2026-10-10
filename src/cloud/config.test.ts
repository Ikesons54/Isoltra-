import { describe, it, expect } from 'vitest'
import { INVALID_CONFIG_MESSAGE, NOT_SET_UP_MESSAGE, PRIVATE_KEY_MESSAGE, readCloudConfig } from './config'

const URL_OK = 'https://abcdefghij.supabase.co'
const KEY_OK = 'sb_publishable_abcdefghijklmnopqrstuvwxyz123456'
// Built at run time so no key-shaped text sits in the source for secret scanners to flag.
const FAKE_PRIVATE_KEY = ['sb', 'secret', 'abcdefghijklmnopqrstuvwxyz123456'].join('_')

const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
const jwt = (role: string) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ role })}.signaturesignaturesignature`

const make = (url: unknown, key: unknown) => readCloudConfig({ VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key })

describe('missing configuration', () => {
  it('says cloud sharing is not set up when nothing is provided', () => {
    for (const env of [{}, undefined]) {
      const r = readCloudConfig(env)
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(r.reason).toBe('not-configured')
        expect(r.message).toBe('Cloud sharing is not set up.')
        expect(r.message).toBe(NOT_SET_UP_MESSAGE)
      }
    }
  })
  it('treats a half-filled configuration as not set up', () => {
    expect(make(URL_OK, '').ok).toBe(false)
    expect(make('', KEY_OK).ok).toBe(false)
  })
  it('treats values copied from .env.example as not set up', () => {
    const r = make('https://YOUR-PROJECT-REF.supabase.co', 'sb_publishable_YOUR_KEY_HERE')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('not-configured')
  })
  it('ignores values that are not text', () => {
    expect(make(123, null).ok).toBe(false)
    expect(make({}, [] as unknown).ok).toBe(false)
  })
})

describe('valid configuration', () => {
  it('accepts an https project URL with a publishable key and trims spaces', () => {
    const r = make(`  ${URL_OK}/  `, `  ${KEY_OK}  `)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.config.url).toBe(URL_OK)
      expect(r.config.publishableKey).toBe(KEY_OK)
    }
  })
  it('allows http only for local development', () => {
    expect(make('http://localhost:54321', KEY_OK).ok).toBe(true)
    expect(make('http://127.0.0.1:54321', KEY_OK).ok).toBe(true)
  })
  it('accepts a legacy anon key', () => {
    expect(make(URL_OK, jwt('anon')).ok).toBe(true)
  })
})

describe('invalid configuration never throws and never leaks a private key', () => {
  it('rejects bad URLs', () => {
    for (const bad of ['not a url', 'http://example.com', 'ftp://x.supabase.co', `${URL_OK}/rest/v1`, 'https://user:pw@x.supabase.co', `${URL_OK}?a=1`, `${URL_OK}#x`]) {
      const r = make(bad, KEY_OK)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.message).toBe(INVALID_CONFIG_MESSAGE)
    }
  })
  it('rejects secret keys', () => {
    const r = make(URL_OK, FAKE_PRIVATE_KEY)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toBe(PRIVATE_KEY_MESSAGE)
  })
  it('rejects a legacy service_role key', () => {
    const r = make(URL_OK, jwt('service_role'))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toBe(PRIVATE_KEY_MESSAGE)
  })
  it('rejects other roles, broken tokens, short keys, spaces and unknown formats', () => {
    for (const bad of [jwt('authenticated'), 'eyJhbGciOiJIUzI1NiJ9.%%%.sig', 'sb_publishable_short', 'sb_publishable_has space inside_aaaaaaaaaa', 'abcdefghijklmnopqrstuvwxyz']) {
      expect(make(URL_OK, bad).ok).toBe(false)
    }
  })
  it('never puts the key itself in an error message', () => {
    const r = make(URL_OK, FAKE_PRIVATE_KEY)
    if (!r.ok) expect(r.message.includes(FAKE_PRIVATE_KEY.slice(0, 18))).toBe(false)
  })
})
