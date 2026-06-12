'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  loading?: boolean
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = []

  if (current <= 3) {
    pages.push(1, 2, 3, 4, '...', total)
  } else if (current >= total - 2) {
    pages.push(1, '...', total - 3, total - 2, total - 1, total)
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total)
  }

  return pages
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  loading = false,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  const btnBase =
    'flex items-center justify-center rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
      {/* Conteo — oculto en mobile muy pequeño */}
      <span className="hidden sm:block text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
        Mostrando {from}–{to} de {total}
      </span>

      {/* Controles */}
      <div className="flex items-center gap-1 mx-auto sm:mx-0">
        {/* Anterior */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || loading}
          className={`${btnBase} w-8 h-8`}
          style={{ color: 'var(--text-secondary)', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
          aria-label="Página anterior"
        >
          <ChevronLeft size={15} />
        </button>

        {/* Desktop: números de página */}
        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers(page, totalPages).map((p, i) =>
            p === '...'
              ? (
                <span
                  key={`dots-${i}`}
                  className="w-8 h-8 flex items-center justify-center text-xs"
                  style={{ color: 'var(--text-faint)' }}
                >
                  …
                </span>
              )
              : (
                <button
                  key={p}
                  onClick={() => onPageChange(p as number)}
                  disabled={loading}
                  aria-current={p === page ? 'page' : undefined}
                  aria-label={`Página ${p}`}
                  className={`${btnBase} w-8 h-8`}
                  style={
                    p === page
                      ? { background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)', color: 'white' }
                      : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                  }
                >
                  {p}
                </button>
              )
          )}
        </div>

        {/* Mobile: Pág N de M */}
        <span
          className="sm:hidden px-3 h-8 flex items-center text-xs font-semibold rounded-xl"
          style={{ color: 'var(--text-secondary)', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
        >
          Pág {page} de {totalPages}
        </span>

        {/* Siguiente */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || loading}
          className={`${btnBase} w-8 h-8`}
          style={{ color: 'var(--text-secondary)', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
          aria-label="Página siguiente"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}
