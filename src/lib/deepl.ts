import * as deepl from 'deepl-node'
import { createAdminClient } from './supabase/admin'

let translator: deepl.Translator | null = null
function getTranslator() {
  if (!translator) translator = new deepl.Translator(process.env.DEEPL_API_KEY!)
  return translator
}

export async function translate(text: string, targetLocale: string, cacheKey: string): Promise<string> {
  if (targetLocale === 'nl' || targetLocale === 'en') return text

  const supabase = createAdminClient()

  const { data: cached } = await supabase.from('translation_cache')
    .select('translated_text').eq('target_locale', targetLocale).eq('source_key', cacheKey).single()

  if (cached) return cached.translated_text

  const result = await getTranslator().translateText(text, 'en', targetLocale as deepl.TargetLanguageCode)
  const translated = result.text

  await supabase.from('translation_cache').upsert({
    source_locale: 'en', target_locale: targetLocale, source_key: cacheKey,
    source_text: text, translated_text: translated,
  })

  return translated
}
