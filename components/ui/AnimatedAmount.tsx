'use client'

import { useState, useEffect } from 'react'
import { useCountUp } from '@/hooks/useCountUp'
import { formatCurrency } from '@/utils/format'

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

interface AnimatedAmountProps {
  value: number
  currency: string
  duration?: number
  className?: string
  style?: React.CSSProperties
}

export function AnimatedAmount({ value, currency, duration = 850, className, style }: AnimatedAmountProps) {
  const reduced  = usePrefersReducedMotion()
  const animated = useCountUp(value, reduced ? 0 : duration)
  return (
    <span className={className} style={style}>
      {formatCurrency(animated, currency)}
    </span>
  )
}
