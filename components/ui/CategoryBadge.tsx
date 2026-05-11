interface CategoryBadgeProps {
  name: string
  color?: string
  size?: 'sm' | 'md'
}

export function CategoryBadge({ name, color = '#6366F1', size = 'sm' }: CategoryBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-semibold"
      style={{
        backgroundColor: `${color}15`,
        color,
        border: `1px solid ${color}30`,
        padding: size === 'sm' ? '2px 9px' : '4px 13px',
        fontSize: size === 'sm' ? 11 : 13,
      }}
    >
      <span
        className="inline-block rounded-full shrink-0"
        style={{ backgroundColor: color, width: size === 'sm' ? 5 : 7, height: size === 'sm' ? 5 : 7 }}
      />
      {name}
    </span>
  )
}
