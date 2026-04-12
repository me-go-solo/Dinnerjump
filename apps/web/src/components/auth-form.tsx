'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Mail } from 'lucide-react'
import { signIn, signUp } from '@/actions/auth'
import { useRouter } from '@/i18n/navigation'

export function AuthForm({ mode = 'login' }: { mode?: 'login' | 'register' }) {
  const t = useTranslations('common')
  const tAuth = useTranslations('auth')
  const router = useRouter()
  const [isRegister, setIsRegister] = useState(mode === 'register')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const email = formData.get('email') as string

    if (isRegister) {
      const result = await signUp(formData)
      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }
      setEmailSent(email)
      setLoading(false)
    } else {
      const result = await signIn(formData)
      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }
      router.push('/dashboard')
      router.refresh()
    }
  }

  if (emailSent) {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
        <Mail className="h-10 w-10 text-gray-600" />
        <h2 className="text-xl font-bold">{tAuth('confirmTitle')}</h2>
        <p className="text-gray-500">
          {tAuth('confirmDescription', { email: emailSent })}
        </p>
      </div>
    )
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
