import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-xl bg-white border text-sm placeholder:text-slate-400 px-4 py-3 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:border-indigo-400',
            error
              ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400'
              : 'border-[var(--border)] focus:ring-indigo-100',
            className
          )}
          style={{ color: 'var(--text-primary)', boxShadow: 'var(--shadow-xs)' }}
          {...props}
        />
        {error && <p className="text-xs font-medium" style={{ color: 'var(--expense-500)' }}>{error}</p>}
        {hint && !error && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
