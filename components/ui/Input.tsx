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
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-xl text-sm px-3.5 py-2.5 transition-all duration-150',
            'focus:outline-none focus:ring-2',
            error
              ? 'focus:ring-red-200 border-red-300'
              : 'focus:ring-violet-200 focus:border-violet-400',
            className
          )}
          style={{
            background: 'var(--bg-card)',
            border: `1px solid ${error ? '#FCA5A5' : 'var(--border)'}`,
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-xs)',
          }}
          {...props}
        />
        {error && <p className="text-xs font-medium" style={{ color: 'var(--expense-500)' }}>{error}</p>}
        {hint && !error && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
