'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Mail } from 'lucide-react'
import { signIn, signUp } from '@/actions/auth'
import { useRouter } from '@/i18n/navigation'
import { btn, input } from '@/lib/design'

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
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <Mail className="h-6 w-6 text-gray-600" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">{tAuth('confirmTitle')}</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          {tAuth('confirmDescription', { email: emailSent })}
        </p>
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      {isRegister && (
        <input name="displayName" type="text" placeholder={t('name')} required className={input.base} />
      )}
      <input name="email" type="email" placeholder={t('email')} required className={input.base} />
      <input name="password" type="password" placeholder={t('password')} required minLength={6} className={input.base} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading} className={btn.primary}>
        {loading ? t('loading') : isRegister ? t('register') : t('login')}
      </button>
      <button type="button" onClick={() => setIsRegister(!isRegister)} className={btn.link + ' text-center'}>
        {isRegister ? t('login') : t('register')}
      </button>
    </form>
  )
}
