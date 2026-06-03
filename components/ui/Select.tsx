'use client'

import { useState, useRef, useEffect, forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, value, onChange, disabled, name, placeholder }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const selectedOption = options.find(o => o.value === String(value ?? ''))

    useEffect(() => {
      function onMouseDown(e: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false)
        }
      }
      if (open) document.addEventListener('mousedown', onMouseDown)
      return () => document.removeEventListener('mousedown', onMouseDown)
    }, [open])

    function handleSelect(optValue: string) {
      onChange?.({ target: { value: optValue } } as React.ChangeEvent<HTMLSelectElement>)
      setOpen(false)
    }

    function handleKeyDown(e: React.KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); return }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v) }
    }

    return (
      <div className="flex flex-col gap-1" ref={containerRef}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-muted)' }}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {/* Trigger */}
          <button
            type="button"
            id={selectId}
            disabled={disabled}
            onClick={() => !disabled && setOpen(v => !v)}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full rounded-xl text-sm px-3.5 py-2.5 transition-all duration-150',
              'flex items-center justify-between gap-2 text-left',
              'focus:outline-none focus:ring-2',
              error   ? 'focus:ring-red-200'    : 'focus:ring-violet-200',
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              className
            )}
            style={{
              background:  'var(--bg-card)',
              border:      `1px solid ${error ? '#FCA5A5' : open ? 'rgba(109,59,215,0.45)' : 'var(--border)'}`,
              color:       selectedOption ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow:   open
                ? '0 0 0 3px rgba(109,59,215,0.10), var(--shadow-xs)'
                : 'var(--shadow-xs)',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="truncate min-w-0">
              {selectedOption?.label ?? placeholder ?? 'Seleccioná...'}
            </span>
            <ChevronDown
              size={14}
              className="shrink-0 transition-transform duration-200"
              style={{
                color:     'var(--text-muted)',
                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          {/* Hidden native <select> for form submissions */}
          <select
            ref={ref}
            name={name}
            value={value}
            onChange={e => onChange?.(e)}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Dropdown panel */}
          {open && (
            <div
              ref={dropdownRef}
              role="listbox"
              className="absolute left-0 right-0 z-50 rounded-2xl overflow-hidden mt-1.5 max-h-60 overflow-y-auto overscroll-contain"
              style={{
                background: 'var(--bg-card)',
                border:     '1px solid var(--border)',
                boxShadow:  'var(--shadow-lg)',
                animation:  'selectDropdownIn 0.12s ease',
              }}
            >
              {options.map(opt => {
                const isSelected = String(value ?? '') === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    className="w-full text-left px-3.5 py-2.5 text-sm flex items-center justify-between gap-2 transition-colors duration-100"
                    style={{
                      color:      isSelected ? 'var(--brand-500)' : 'var(--text-primary)',
                      background: isSelected ? 'color-mix(in srgb, var(--brand-500) 8%, transparent)' : 'transparent',
                      fontWeight: isSelected ? 600 : 400,
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-subtle)'
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                    }}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check size={13} className="shrink-0" style={{ color: 'var(--brand-500)' }} />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs font-medium" style={{ color: 'var(--expense-500)' }}>{error}</p>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'
