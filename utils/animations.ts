import type { Variants } from 'motion/react'

export const DURATION = {
  micro:  0.15,
  fast:   0.18,
  normal: 0.22,
  slow:   0.28,
}

// Spring-like ease out — suave y profesional
export const EASE_OUT = [0.16, 1, 0.3, 1] as const

export const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.normal, ease: EASE_OUT } },
  exit:    { opacity: 0, transition: { duration: DURATION.fast, ease: 'easeIn' } },
}

export const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE_OUT } },
  exit:    { opacity: 0, y: 4, transition: { duration: DURATION.fast, ease: 'easeIn' } },
}

export const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: DURATION.normal, ease: EASE_OUT } },
  exit:    { opacity: 0, scale: 0.97, transition: { duration: DURATION.fast, ease: 'easeIn' } },
}

export const slideInLeft: Variants = {
  hidden:  { x: '-100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: DURATION.normal, ease: EASE_OUT } },
  exit:    { x: '-100%', opacity: 0, transition: { duration: DURATION.fast, ease: 'easeIn' } },
}

export const slideInRight: Variants = {
  hidden:  { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: DURATION.normal, ease: EASE_OUT } },
  exit:    { x: '100%', opacity: 0, transition: { duration: DURATION.fast, ease: 'easeIn' } },
}

// Bottom-sheet en mobile
export const slideUp: Variants = {
  hidden:  { y: '100%', opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: DURATION.normal, ease: EASE_OUT } },
  exit:    { y: '100%', opacity: 0, transition: { duration: DURATION.fast, ease: 'easeIn' } },
}

export const modalOverlay: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.fast } },
  exit:    { opacity: 0, transition: { duration: DURATION.fast } },
}

// Modal centrado en desktop (scale + fade)
export const modalContent: Variants = {
  hidden:  { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: DURATION.normal, ease: EASE_OUT } },
  exit:    { opacity: 0, scale: 0.97, y: 4, transition: { duration: DURATION.fast, ease: 'easeIn' } },
}

// Modal bottom-sheet en mobile
export const modalSheet: Variants = {
  hidden:  { y: '100%', opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: DURATION.normal, ease: EASE_OUT } },
  exit:    { y: '100%', opacity: 0, transition: { duration: DURATION.fast, ease: 'easeIn' } },
}

// Contenedor padre para stagger
export const staggerContainer: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}

// Item hijo del stagger
export const staggerItem: Variants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE_OUT } },
}

// Transición entre pasos de un wizard (siguiente → izquierda)
export const stepForward: Variants = {
  hidden:  { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: DURATION.normal, ease: EASE_OUT } },
  exit:    { opacity: 0, x: -20, transition: { duration: DURATION.fast } },
}
