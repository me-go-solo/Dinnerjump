import { describe, it, expect } from 'vitest'
import { generateInviteCode } from '@/lib/invite-code'

describe('generateInviteCode', () => {
  it('generates a 6-character uppercase code', () => {
    const code = generateInviteCode()
    expect(code).toMatch(/^[A-Z0-9]{6}$/)
  })
  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateInviteCode()))
    expect(codes.size).toBe(100)
  })
})
