'use client'

import { useEffect, useState } from 'react'

type ReadToggleProps = {
  initialShowUnreadOnly?: boolean
  onChange?: (showUnreadOnly: boolean) => void
  className?: string
  disabled?: boolean
}

export function ReadToggle({
  initialShowUnreadOnly = false,
  onChange,
  className = '',
  disabled = false,
}: ReadToggleProps) {
  const [showUnreadOnly, setShowUnreadOnly] = useState(initialShowUnreadOnly)

  useEffect(() => {
    setShowUnreadOnly(initialShowUnreadOnly)
  }, [initialShowUnreadOnly])

  const handleToggle = (value: boolean) => {
    if (disabled) {
      return
    }

    setShowUnreadOnly(value)
    onChange?.(value)
  }

  return (
    <div
      className={`inline-flex items-center rounded-full border border-slate-800/60 bg-slate-900/60 p-1 text-xs ${className}`}
      role="group"
      aria-label="既読・未読フィルター"
    >
      <button
        type="button"
        onClick={() => handleToggle(false)}
        disabled={disabled}
        className={[
          'rounded-full px-3 py-1 font-semibold transition',
          !showUnreadOnly ? 'bg-slate-100 text-slate-900 shadow' : 'text-slate-400',
          disabled ? 'cursor-not-allowed opacity-60' : 'hover:text-slate-200',
        ].join(' ')}
      >
        すべて表示
      </button>
      <button
        type="button"
        onClick={() => handleToggle(true)}
        disabled={disabled}
        className={[
          'rounded-full px-3 py-1 font-semibold transition',
          showUnreadOnly ? 'bg-slate-100 text-slate-900 shadow' : 'text-slate-400',
          disabled ? 'cursor-not-allowed opacity-60' : 'hover:text-slate-200',
        ].join(' ')}
      >
        未読のみ
      </button>
    </div>
  )
}
