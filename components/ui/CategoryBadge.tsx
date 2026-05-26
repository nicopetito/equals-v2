import {
  Tag, type LucideIcon,
  Utensils, Car, HeartPulse, Clapperboard, Shirt, Home,
  BookOpen, Zap, MoreHorizontal, Briefcase, Laptop, TrendingUp,
  PlusCircle, ShoppingBag, Plane, Coffee, Music, Dumbbell,
  Gift, CreditCard, PiggyBank, Building2, Baby,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  'utensils':        Utensils,
  'car':             Car,
  'heart-pulse':     HeartPulse,
  'clapperboard':    Clapperboard,
  'shirt':           Shirt,
  'home':            Home,
  'book-open':       BookOpen,
  'zap':             Zap,
  'more-horizontal': MoreHorizontal,
  'briefcase':       Briefcase,
  'laptop':          Laptop,
  'trending-up':     TrendingUp,
  'plus-circle':     PlusCircle,
  'shopping-bag':    ShoppingBag,
  'plane':           Plane,
  'coffee':          Coffee,
  'music':           Music,
  'dumbbell':        Dumbbell,
  'gift':            Gift,
  'credit-card':     CreditCard,
  'piggy-bank':      PiggyBank,
  'building-2':      Building2,
  'baby':            Baby,
  'tag':             Tag,
}

interface CategoryBadgeProps {
  name: string
  color?: string
  icon?: string
  size?: 'sm' | 'md'
}

export function CategoryBadge({ name, color = '#6d3bd7', icon, size = 'sm' }: CategoryBadgeProps) {
  const IconComp = (icon && ICON_MAP[icon]) ?? null
  const iconPx   = size === 'sm' ? 10 : 12

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3.5 py-1 text-[13px]'}`}
      style={{
        backgroundColor: `${color}15`,
        color,
        border: `1px solid ${color}30`,
      }}
    >
      {IconComp
        ? <IconComp size={iconPx} />
        : <span
            className="inline-block rounded-full shrink-0"
            style={{ backgroundColor: color, width: size === 'sm' ? 5 : 7, height: size === 'sm' ? 5 : 7 }}
          />
      }
      {name}
    </span>
  )
}
