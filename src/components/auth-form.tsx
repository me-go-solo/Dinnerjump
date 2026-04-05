'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { signIn, signUp } from '@/actions/auth'
import { useRouter } from '@/i18n/navigation'

export function AuthForm({ mode = 'login' }: { mode?: 'login' | 'register' }) {
  const t = useTranslations('common')
  const router = useRouter()
  const [isRegister, setIsRegister] = useState(mode === 'register')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = isRegister ? await signUp(formData) : await signIn(formData)
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      {isRegister && (
        <input name="displayName" type="text" placeholder="Naam" required className="rounded border px-3 py-2" />
      )}
      <input name="email" type="email" placeholder="E-mail" required className="rounded border px-3 py-2" />
      <input name="password" type="password" placeholder="Wachtwoord" required minLength={6} className="rounded border px-3 py-2" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading} className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50">
        {loading ? t('loading') : isRegister ? t('register') : t('login')}
      </button>
      <button type="button" onClick={() => setIsRegister(!isRegister)} className="text-sm text-gray-500 hover:underline">
        {isRegister ? t('login') : t('register')}
      </button>
    </form>
  )
}
