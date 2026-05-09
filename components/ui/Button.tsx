import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const VARIANTS = {
  primary:  'text-white hover:opacity-90 active:opacity-80',
  secondary:'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200',
  danger:   'bg-red-500 hover:bg-red-600 text-white',
  ghost:    'hover:bg-violet-50 text-gray-500 hover:text-violet-700',
  outline:  'border border-violet-200 hover:bg-violet-50 text-violet-700',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

const PRIMARY_STYLE = { background: 'linear-gradient(135deg,#463397,#9850eb)' }

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS
  size?: keyof typeof SIZES
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, style, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      style={variant === 'primary' ? { ...PRIMARY_STYLE, ...style } : style}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
