import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { sha256HexSync, sha256SriSync } from '../../core/sha256'

describe('sync sha256', () => {
  it('matches Node crypto for many lengths, including block boundaries', () => {
    for (const n of [0, 1, 3, 55, 56, 63, 64, 65, 119, 120, 1000, 10_000]) {
      const s = 'aé😀'.repeat(n).slice(0, n)
      expect(sha256HexSync(s)).toBe(createHash('sha256').update(s, 'utf8').digest('hex'))
    }
  })

  it('produces CSP hash format', () => {
    expect(sha256SriSync('alert(1)')).toBe('sha256-' + createHash('sha256').update('alert(1)').digest('base64'))
  })
})
