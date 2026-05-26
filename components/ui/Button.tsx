import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const BASE = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-40 disabled:cursor-not-allowed'

const VARIANTS = {
  primary:          'text-white shadow-md hover:shadow-lg hover:-translate-y-px active:translate-y-0 focus:ring-[#d0bcff]/50',
  secondary:        'backdrop-blur-sm border text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border)] focus:ring-[var(--brand-500)]/30',
  danger:           'text-white shadow-md hover:shadow-lg hover:-translate-y-px focus:ring-red-300/40',
  ghost:            'text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] focus:ring-[var(--brand-500)]/30',
  outline:          'border-2 text-[var(--brand-500)] hover:bg-[var(--brand-50)] focus:ring-[var(--brand-500)]/30',
  'hero-primary':   'hero-btn hero-btn-primary focus:ring-white/40',
  'hero-secondary': 'hero-btn hero-btn-secondary focus:ring-white/30',
}

const SIZES = {
  sm: 'px-3.5 py-1.5 text-xs',
  md: 'px-4.5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

const GRAD_PRIMARY: React.CSSProperties = {
  background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)',
  boxShadow: '0 4px 14px rgba(109,59,215,0.45)',
}
const GRAD_DANGER: React.CSSProperties = {
  background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
  boxShadow: '0 4px 14px rgba(220,38,38,0.28)',
}
const SECONDARY_STYLE: React.CSSProperties = {
  background: 'var(--bg-subtle)',
  border: '1px solid var(--border)',
}
const OUTLINE_STYLE: React.CSSProperties = {
  borderColor: 'var(--brand-100)',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS
  size?: keyof typeof SIZES
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, style, children, ...props }, ref) => {
    const variantStyle: React.CSSProperties =
      variant === 'primary'   ? { ...GRAD_PRIMARY, ...style }
      : variant === 'danger'  ? { ...GRAD_DANGER, ...style }
      : variant === 'secondary' ? { ...SECONDARY_STYLE, ...style }
      : variant === 'outline' ? { ...OUTLINE_STYLE, ...style }
      : style ?? {}

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={variantStyle}
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


