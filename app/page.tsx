import { redirect } from 'next/navigation'

import { auth } from '@/auth'
import LoginButton from '@/components/auth/LoginButton'

export default async function HomePage() {
  const session = await auth()

  if (session) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <div className="max-w-md space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">GroupFeeder</h1>
          <p className="text-sm text-slate-300 sm:text-base">
            Googleアカウントでサインインして、グループ別にフィードを整理しましょう。
          </p>
        </div>
        <LoginButton />
      </div>
    </main>
  )
}
