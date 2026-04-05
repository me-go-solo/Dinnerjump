import { AuthForm } from '@/components/auth-form'

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-16">
      <h1 className="mb-8 text-2xl font-bold">Dinner Jump</h1>
      <AuthForm />
    </div>
  )
}
