import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full rounded-xl text-sm px-3.5 py-2.5 transition-all duration-150',
            'focus:outline-none focus:ring-2 appearance-none cursor-pointer',
            error ? 'focus:ring-red-200' : 'focus:ring-violet-200 focus:border-violet-400',
            className
          )}
          style={{
            background: 'var(--bg-card)',
            border: `1px solid ${error ? '#FCA5A5' : 'var(--border)'}`,
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-xs)',
          }}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <p className="text-xs font-medium" style={{ color: 'var(--expense-500)' }}>{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
