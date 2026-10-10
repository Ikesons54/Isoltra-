// Guards the local-first promise: cloud code stays in src/cloud and local code never depends on it.
import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const SRC = join(process.cwd(), 'src')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const isTest = (f: string) => /\.test\.tsx?$/.test(f)
const sources = existsSync(SRC) ? walk(SRC).filter(f => /\.tsx?$/.test(f) && !isTest(f)) : []
const rel = (f: string) => relative(SRC, f).split(sep).join('/')

function importsOf(file: string): string[] {
  const text = readFileSync(file, 'utf8')
  const found: string[] = []
  for (const m of text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) found.push(m[1])
  return found
}

// Local-first code that must keep working with no network and no configuration.
const PROTECTED = [/^engine\//, /^db\//, /^screens\/LiveScreen\.tsx$/, /^screens\/ChartStrip\.tsx$/, /^useViewportWidth\.ts$/, /^songs\.ts$/]

describe('cloud isolation', () => {
  it('finds the source folder', () => {
    expect(sources.length > 0).toBe(true)
  })

  it('only src/cloud imports the Supabase library', () => {
    const offenders = sources.filter(f => !rel(f).startsWith('cloud/') && importsOf(f).some(s => s.startsWith('@supabase/')))
    expect(offenders.map(rel)).toEqual([])
  })

  it('Live Stage Mode, the engine, the database layer and shared helpers never import cloud code', () => {
    const offenders = sources
      .filter(f => PROTECTED.some(p => p.test(rel(f))))
      .filter(f => importsOf(f).some(s => /(^|\/)cloud(\/|$)/.test(s) || s.includes('supabase')))
    expect(offenders.map(rel)).toEqual([])
  })
})
