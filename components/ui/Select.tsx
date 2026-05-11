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
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full rounded-xl bg-white border text-sm px-4 py-3 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:border-indigo-400 appearance-none cursor-pointer',
            error
              ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400'
              : 'border-[var(--border)] focus:ring-indigo-100',
            className
          )}
          style={{ color: 'var(--text-primary)', boxShadow: 'var(--shadow-xs)' }}
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
