import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface HeaderEntry {
  source: string
  headers: Array<{ key: string; value: string }>
}

interface FirebaseConfig {
  hosting: {
    headers: HeaderEntry[]
    rewrites: Array<{ source: string; destination: string }>
  }
}

const root = process.cwd()

function readProjectFile(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('Phase 0 release contracts', () => {
  it('sets no-cache for every SPA request before overriding fingerprinted assets as immutable', () => {
    const config = JSON.parse(readProjectFile('firebase.json')) as FirebaseConfig
    const broadRuleIndex = config.hosting.headers.findIndex(({ source }) => source === '**')
    const assetRuleIndex = config.hosting.headers.findIndex(({ source }) => source === '/assets/**')
    const broadCache = config.hosting.headers[broadRuleIndex]?.headers.find(({ key }) => key === 'Cache-Control')
    const assetCache = config.hosting.headers[assetRuleIndex]?.headers.find(({ key }) => key === 'Cache-Control')

    expect(config.hosting.rewrites).toContainEqual({ source: '**', destination: '/index.html' })
    expect(broadCache?.value).toBe('no-cache, no-store, must-revalidate')
    expect(assetRuleIndex).toBeGreaterThan(broadRuleIndex)
    expect(assetCache?.value).toBe('public, max-age=31536000, immutable')
  })

  it('defines mandatory test, lint, typecheck, and build CI gates', () => {
    const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> }
    const workflow = readProjectFile('.github/workflows/ci.yml')

    expect(packageJson.scripts.test).toBeTruthy()
    expect(packageJson.scripts.lint).toBeTruthy()
    expect(packageJson.scripts.typecheck).toBe('tsc -b')
    expect(packageJson.scripts.build).toBeTruthy()
    for (const command of ['npm test', 'npm run lint', 'npm run typecheck', 'npm run build']) {
      expect(workflow).toContain(command)
    }
  })

  it('states that Phase 0 is not the MVP and lists the major unimplemented systems', () => {
    const readme = readProjectFile('README.md')

    expect(readme).toContain('Phase 0はMVPではありません')
    for (const missing of [
      '相互情報量と測地線長の実計算',
      'テンソルネットワークの contraction',
      'Null Aperture',
      'Event Flight Recorder',
      'Anomaly Scene Archive',
      'Deterministic Replay',
    ]) {
      expect(readme).toContain(missing)
    }
  })
})
