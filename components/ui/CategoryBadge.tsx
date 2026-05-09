interface CategoryBadgeProps {
  name: string
  color?: string
  size?: 'sm' | 'md'
}

export function CategoryBadge({ name, color = '#6b7280', size = 'sm' }: CategoryBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-medium"
      style={{
        backgroundColor: `${color}18`,
        color,
        padding: size === 'sm' ? '2px 8px' : '4px 12px',
        fontSize: size === 'sm' ? 11 : 13,
      }}
    >
      <span
        className="inline-block rounded-full shrink-0"
        style={{ backgroundColor: color, width: size === 'sm' ? 6 : 8, height: size === 'sm' ? 6 : 8 }}
      />
      {name}
    </span>
  )
}
