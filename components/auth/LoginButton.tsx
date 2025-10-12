'use client'

import { useTransition } from 'react'
import { signIn } from 'next-auth/react'

type LoginButtonProps = {
  className?: string
}

export default function LoginButton({ className }: LoginButtonProps) {
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    if (isPending) return
    startTransition(() => {
      void signIn('google')
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-75 ${className ?? ''}`}
      disabled={isPending}
    >
      <svg aria-hidden="true" className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none">
        <path
          d="M20.16 12.204c0-.639-.057-1.252-.164-1.84H12v3.48h4.582a4.007 4.007 0 0 1-1.737 2.63v2.182h2.813c1.648-1.517 2.502-3.752 2.502-6.452Z"
          fill="#4285F4"
        />
        <path
          d="M12 21c2.43 0 4.47-.807 5.96-2.344l-2.813-2.182c-.782.524-1.784.83-3.147.83-2.42 0-4.47-1.635-5.201-3.834H3.84v2.262A9.998 9.998 0 0 0 12 21Z"
          fill="#34A853"
        />
        <path
          d="M6.799 13.469A5.99 5.99 0 0 1 6.49 12c0-.508.087-1.004.309-1.469V8.27H3.84A9.994 9.994 0 0 0 3 12c0 1.6.382 3.11 1.04 4.43l2.759-2.961Z"
          fill="#FBBC05"
        />
        <path
          d="M12 6.75c1.35 0 2.556.465 3.509 1.378l2.63-2.63C16.47 3.517 14.43 2.7 12 2.7 8.46 2.7 5.437 4.716 3.84 8.27l2.968 2.262C7.54 8.408 9.58 6.75 12 6.75Z"
          fill="#EA4335"
        />
      </svg>
      {isPending ? 'リダイレクト中...' : 'Googleでサインイン'}
    </button>
  )
}
