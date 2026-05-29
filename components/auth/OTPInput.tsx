'use client'

import { useRef, useEffect, type ClipboardEvent, type KeyboardEvent } from 'react'

interface OTPInputProps {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
  error?: boolean
}

export function OTPInput({ value, onChange, disabled, error }: OTPInputProps) {
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  useEffect(() => {
    const firstEmpty = value.length < 4 ? value.length : 3
    refs[firstEmpty]?.current?.focus()
  }, [])  // solo al montar

  const digits = value.padEnd(4, '').split('').slice(0, 4)

  function handleChange(index: number, char: string) {
    const digit = char.replace(/[^0-9]/g, '').slice(-1)
    const arr = digits.map((d, i) => (i === index ? digit : d))
    const newVal = arr.join('').replace(/ /g, '')
    onChange(newVal)
    if (digit && index < 3) {
      refs[index + 1]?.current?.focus()
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const arr = digits.map((d, i) => (i === index - 1 ? '' : d))
        onChange(arr.join('').replace(/ /g, ''))
        refs[index - 1]?.current?.focus()
      } else {
        const arr = digits.map((d, i) => (i === index ? '' : d))
        onChange(arr.join('').replace(/ /g, ''))
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs[index - 1]?.current?.focus()
    } else if (e.key === 'ArrowRight' && index < 3) {
      refs[index + 1]?.current?.focus()
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 4)
    onChange(pasted)
    const focusIdx = Math.min(pasted.length, 3)
    refs[focusIdx]?.current?.focus()
  }

  const borderColor = error
    ? 'var(--expense-500)'
    : 'var(--border)'

  const focusRingClass = error
    ? 'focus:ring-2 focus:ring-[var(--expense-500)]'
    : 'focus:ring-2 focus:ring-[var(--brand-500)]'

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit === ' ' ? '' : digit}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          disabled={disabled}
          aria-label={`Dígito ${i + 1} de 4`}
          className={`w-14 h-14 text-2xl font-bold text-center rounded-xl border transition-all duration-150 outline-none ${focusRingClass} disabled:opacity-50`}
          style={{
            background: 'var(--bg-card)',
            border: `1.5px solid ${borderColor}`,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sora)',
            boxShadow: 'var(--shadow-xs)',
          }}
        />
      ))}
    </div>
  )
}
