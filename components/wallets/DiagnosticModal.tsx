'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle2, RefreshCw, Copy, Check, ArrowUpRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { walletsService } from '@/services/wallets.service'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/providers/ToastProvider'
import { formatCurrency, safeNumber } from '@/utils/format'
import type { WalletDiagnostic, WalletWithBalance } from '@/types'

interface DiagnosticModalProps {
  open: boolean
  onClose: () => void
  liveWallets: WalletWithBalance[]
}

interface DiagnosticRow extends WalletDiagnostic {
  live_balance: number
  discrepancy: number
}

export function DiagnosticModal({ open, onClose, liveWallets }: DiagnosticModalProps) {
  const router = useRouter()
  const { addToast } = useToast()

  const [rows, setRows]       = useState<DiagnosticRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [copied, setCopied]   = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const diagnostics = await walletsService.diagnose()
      const merged: DiagnosticRow[] = diagnostics.map(d => {
        const live = liveWallets.find(w => w.id === d.wallet_id)
        const live_balance = safeNumber(live?.current_balance)
        return { ...d, live_balance, discrepancy: Math.abs(d.computed_balance - live_balance) }
      })
      setRows(merged)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar diagnóstico')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) load()
  }, [open])

  const hasDiscrepancy = rows.some(r => r.discrepancy > 0.001)

  function buildDiagnosticText(): string {
    const now = new Date().toLocaleString('es-AR')
    const lines = [
      `=== Diagnóstico financiero Equal — ${now} ===`,
      '',
      hasDiscrepancy ? '⚠️  Se detectaron discrepancias' : '✅  Todos los saldos son consistentes',
      '',
    ]
    for (const r of rows) {
      lines.push(`Billetera: ${r.wallet_name} (${r.currency})`)
      lines.push(`  Saldo inicial:   ${r.initial_balance}`)
      lines.push(`  Ingresos:        ${r.income_total}`)
      lines.push(`  Egresos:         ${r.expense_total}`)
      lines.push(`  Balance RPC:     ${r.computed_balance}`)
      lines.push(`  Balance UI:      ${r.live_balance}`)
      if (r.discrepancy > 0.001) {
        lines.push(`  ⚠️  Diferencia:  ${r.discrepancy}`)
      }
      lines.push(`  Transacciones:   ${r.transaction_count}`)
      lines.push('')
    }
    return lines.join('\n')
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildDiagnosticText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      addToast('No se pudo copiar al portapapeles', 'error')
    }
  }

  function handleViewTransactions(walletId: string) {
    onClose()
    router.push(`/transactions?wallet_id=${walletId}`)
  }

  return (
    <Modal open={open} onClose={onClose} title="Diagnóstico financiero">
      <div className="space-y-4">

        {/* Status banner */}
        {!loading && !error && rows.length > 0 && (
          <div
            className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium"
            style={
              hasDiscrepancy
                ? { background: 'var(--expense-50)', color: 'var(--expense-700)', border: '1px solid var(--expense-200)' }
                : { background: 'rgba(22,163,74,0.07)', color: '#15803d', border: '1px solid rgba(22,163,74,0.18)' }
            }
          >
            {hasDiscrepancy
              ? <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              : <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
            }
            <span>
              {hasDiscrepancy
                ? 'Se detectaron discrepancias entre el balance calculado y el balance mostrado en la UI.'
                : 'Todos los saldos son consistentes. El balance calculado coincide con el balance mostrado.'}
            </span>
          </div>
        )}

        {error && (
          <div
            className="rounded-xl px-3 py-2 text-xs font-medium"
            style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}
          >
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-8">
            <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--brand-500)' }} />
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="space-y-3">
            {rows.map(row => (
              <div
                key={row.wallet_id}
                className="rounded-2xl p-4 space-y-3"
                style={{
                  background: row.discrepancy > 0.001 ? 'var(--expense-50)' : 'var(--bg-subtle)',
                  border: `1px solid ${row.discrepancy > 0.001 ? 'var(--expense-200)' : 'var(--border)'}`,
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
                      {row.wallet_name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {row.currency} · {row.transaction_count} transacciones
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {row.discrepancy > 0.001 && (
                      <span
                        className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--expense-100)', color: 'var(--expense-700)' }}
                      >
                        <AlertTriangle size={11} /> Discrepancia
                      </span>
                    )}
                    <button
                      onClick={() => handleViewTransactions(row.wallet_id)}
                      className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-opacity hover:opacity-70"
                      style={{ background: 'rgba(109,59,215,0.08)', color: 'var(--brand-600)', border: '1px solid rgba(109,59,215,0.15)' }}
                    >
                      <ArrowUpRight size={11} /> Ver transacciones
                    </button>
                  </div>
                </div>

                {/* Balance detail */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <DiagRow label="Saldo inicial" value={formatCurrency(row.initial_balance, row.currency)} />
                  <DiagRow label="Total ingresos" value={formatCurrency(row.income_total, row.currency)} positive />
                  <DiagRow label="Total egresos" value={formatCurrency(row.expense_total, row.currency)} negative />
                  <DiagRow label="Balance calculado (RPC)" value={formatCurrency(row.computed_balance, row.currency)} bold />
                  <DiagRow label="Balance en UI (vista)" value={formatCurrency(row.live_balance, row.currency)} bold highlight={row.discrepancy > 0.001} />
                  {row.discrepancy > 0.001 && (
                    <DiagRow
                      label="Diferencia"
                      value={`${row.currency} ${row.discrepancy.toFixed(2)}`}
                      bold
                      alert
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex justify-between items-center pt-1">
          <div className="flex gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--brand-500)' }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
            {rows.length > 0 && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70"
                style={{ color: copied ? '#15803d' : 'var(--text-secondary)' }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copiado' : 'Copiar diagnóstico'}
              </button>
            )}
          </div>
          <Button variant="secondary" onClick={onClose} size="sm">
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function DiagRow({
  label, value, positive, negative, bold, highlight, alert,
}: {
  label: string
  value: string
  positive?: boolean
  negative?: boolean
  bold?: boolean
  highlight?: boolean
  alert?: boolean
}) {
  return (
    <div
      className="flex justify-between items-center rounded-lg px-2.5 py-1.5"
      style={{
        background: alert ? 'var(--expense-100)' : highlight ? 'var(--expense-50)' : 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
    >
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span
        style={{
          color: alert ? 'var(--expense-700)' : positive ? 'var(--income-600)' : negative ? 'var(--expense-600)' : 'var(--text-primary)',
          fontWeight: bold ? 600 : 400,
          fontFamily: 'var(--font-sora)',
        }}
      >
        {value}
      </span>
    </div>
  )
}
