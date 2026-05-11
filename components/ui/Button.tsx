import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const BASE = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

const VARIANTS = {
  primary:   'text-white shadow-md hover:shadow-lg hover:-translate-y-px active:translate-y-0 focus:ring-indigo-400',
  secondary: 'bg-white border border-[var(--border)] text-[var(--text-secondary)] hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-300 shadow-sm',
  danger:    'text-white shadow-md hover:shadow-lg hover:-translate-y-px focus:ring-rose-400',
  ghost:     'text-[var(--text-secondary)] hover:bg-indigo-50 hover:text-indigo-600 focus:ring-indigo-300',
  outline:   'border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 focus:ring-indigo-300 bg-white',
}

const SIZES = {
  sm: 'px-3.5 py-1.5 text-xs',
  md: 'px-4.5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

const GRAD_PRIMARY = { background: 'var(--grad-brand)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }
const GRAD_DANGER  = { background: 'var(--grad-expense)', boxShadow: '0 4px 14px rgba(244,63,94,0.4)' }

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS
  size?: keyof typeof SIZES
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, style, children, ...props }, ref) => {
    const gradStyle =
      variant === 'primary' ? { ...GRAD_PRIMARY, ...style }
      : variant === 'danger' ? { ...GRAD_DANGER, ...style }
      : style

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={gradStyle}
        className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
        {...props}
      >
        {loading && (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
