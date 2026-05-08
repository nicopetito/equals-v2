import { cn } from '@/lib/utils'

interface CategoryBadgeProps {
  name: string
  color?: string
  size?: 'sm' | 'md'
}

export function CategoryBadge({ name, color = '#6b7280', size = 'sm' }: CategoryBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
      style={{ backgroundColor: `${color}20`, color }}
    >
      <span
        className="inline-block rounded-full"
        style={{ backgroundColor: color, width: size === 'sm' ? 6 : 8, height: size === 'sm' ? 6 : 8 }}
      />
      {name}
    </span>
  )
}
