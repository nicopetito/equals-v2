'use client'

import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number, duration = 900, decimals = 2): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const startValueRef = useRef(0)

  useEffect(() => {
    if (duration <= 0) {
      setValue(target)
      return
    }

    startValueRef.current = value
    startTimeRef.current = null

    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    function animate(time: number) {
      if (!startTimeRef.current) startTimeRef.current = time
      const elapsed  = time - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startValueRef.current + (target - startValueRef.current) * eased
      const factor  = Math.pow(10, decimals)
      setValue(Math.round(current * factor) / factor)
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, decimals])

  return value
}
