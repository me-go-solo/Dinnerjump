import { describe, it, expect } from 'vitest'
import { generateDuoCsv } from '@/lib/csv'

describe('generateDuoCsv', () => {
  it('generates CSV with headers and rows', () => {
    const duos = [
      {
        person1_name: 'Jan de Vries',
        person2_name: 'Marieke de Vries',
        person1_email: 'jan@example.com',
        person2_email: 'marieke@example.com',
        status: 'confirmed' as const,
        created_at: '2026-04-03T10:00:00Z',
        hosted_course: 'appetizer' as const,
      },
    ]
    const csv = generateDuoCsv(duos)
    expect(csv).toContain('Duo,E-mail 1,E-mail 2,Status,Aangemeld,Gang')
    expect(csv).toContain('Jan de Vries & Marieke de Vries')
    expect(csv).toContain('jan@example.com')
    expect(csv).toContain('confirmed')
  })

  it('handles null person2', () => {
    const duos = [
      {
        person1_name: 'Solo',
        person2_name: null,
        person1_email: 'solo@example.com',
        person2_email: null,
        status: 'confirmed' as const,
        created_at: '2026-04-03T10:00:00Z',
        hosted_course: null,
      },
    ]
    const csv = generateDuoCsv(duos)
    expect(csv).toContain('Solo')
    expect(csv).not.toContain('& null')
  })
})
