import { NextRequest, NextResponse } from 'next/server'
import { translate } from '@/lib/deepl'

export async function POST(request: NextRequest) {
  const { texts, targetLocale } = await request.json()
  if (!texts || !targetLocale) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const translations: Record<string, string> = {}
  for (const [key, text] of Object.entries(texts as Record<string, string>)) {
    translations[key] = await translate(text, targetLocale, key)
  }

  return NextResponse.json({ translations })
}
