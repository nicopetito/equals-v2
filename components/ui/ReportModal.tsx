'use client'

import { useRef, useMemo } from 'react'
import { X, Printer } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { TransactionWithDetails } from '@/types'
import { formatCurrency } from '@/utils/format'
import { REAL_TRANSACTION_KINDS, parseTransferNotes, KIND_COPY, LABEL_COPY } from '@/utils/constants'
import { calculateSavingsMetrics } from '@/utils/finance'

const LEGACY_INTERNAL_LABELS = ['internal_transfer', 'wallet_adjustment', 'initial_balance', 'reservation_deposit', 'reservation_withdraw']

interface Props {
  open: boolean
  onClose: () => void
  transactions: TransactionWithDetails[]
  period: string
  currency: string
}

export function ReportModal({ open, onClose, transactions, period, currency }: Props) {
  const printRef = useRef<HTMLDivElement>(null)

  const derived = useMemo(() => {
    const currencies = currency !== 'all'
      ? [currency]
      : [...new Set(transactions.map(t => t.currency))].filter(Boolean)

    // Sección A: solo movimientos financieros reales (excluye transfers, ajustes, reservas, saldos iniciales)
    const realTxs = transactions.filter(t =>
      t.transaction_kind
        ? REAL_TRANSACTION_KINDS.has(t.transaction_kind)
        : !(t.label && LEGACY_INTERNAL_LABELS.includes(t.label))
    )

    // Contadores de movimientos internos para Sección B (sin inflar montos)
    const transferGroupKeys = new Set(
      transactions
        .filter(t => t.transaction_kind === 'transfer' || t.label === 'internal_transfer')
        .map(t => t.transfer_group_id ?? parseTransferNotes(t.notes)?.transfer_id ?? t.id)
        .filter(Boolean)
    )
    const internalCounts = {
      transfers:   Math.max(1, Math.ceil(transferGroupKeys.size / 2)) * (transferGroupKeys.size > 0 ? 1 : 0),
      initialBal:  transactions.filter(t => t.transaction_kind === 'initial_balance' || t.label === 'initial_balance').length,
      adjustments: transactions.filter(t => t.transaction_kind === 'wallet_adjustment' || t.label === 'wallet_adjustment').length,
      reserves:    transactions.filter(t => t.transaction_kind === 'reserve_deposit' || t.transaction_kind === 'reserve_withdrawal').length,
    }
    const hasInternalMovements = Object.values(internalCounts).some(v => v > 0)

    // Sección C: movimientos especiales
    const refundTxs = transactions.filter(t => t.transaction_kind === 'refund_credit')
    const yieldTxs  = transactions.filter(t => t.transaction_kind === 'yield' || t.subtype === 'yield')

    const statsByCurrency = currencies.map(cur => {
      const txs = currency !== 'all' ? realTxs : realTxs.filter(t => t.currency === cur)
      const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      return { currency: cur, income: inc, expenses: exp, balance: inc - exp }
    })

    const { savingsRate: savingRateRaw } = calculateSavingsMetrics(realTxs)
    const savingRate = savingRateRaw ?? 0

    // Rendimientos por billetera
    const yieldMap = new Map<string, { walletName: string; amount: number; currency: string }>()
    yieldTxs.forEach(t => {
      const key = t.wallet_name ?? 'Billetera'
      const entry = yieldMap.get(key) ?? { walletName: key, amount: 0, currency: t.currency }
      entry.amount += t.amount
      yieldMap.set(key, entry)
    })
    const yieldByWallet = Array.from(yieldMap.values()).sort((a, b) => b.amount - a.amount)
    const totalYield = yieldByWallet.reduce((s, y) => s + y.amount, 0)

    const catMap = new Map<string, { amount: number; color: string; currency: string }>()
    realTxs.filter(t => t.type === 'expense').forEach(t => {
      const name = t.category_name ?? 'Sin categoría'
      const entry = catMap.get(name) ?? { amount: 0, color: t.category_color ?? '#6d3bd7', currency: t.currency }
      entry.amount += t.amount
      catMap.set(name, entry)
    })
    const topCats = Array.from(catMap.entries())
      .sort(([, a], [, b]) => b.amount - a.amount)
      .slice(0, 5)
    const totalExp = topCats.reduce((s, [, v]) => s + v.amount, 0)

    const recentTx = [...realTxs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 15)

    return {
      currencies, realTxs, internalCounts, hasInternalMovements, refundTxs, yieldTxs,
      statsByCurrency, savingRate, yieldByWallet, totalYield, topCats, totalExp, recentTx,
    }
  }, [transactions, currency])

  const {
    currencies, realTxs, internalCounts, hasInternalMovements, refundTxs, yieldTxs,
    statsByCurrency, savingRate, yieldByWallet, totalYield, topCats, totalExp, recentTx,
  } = derived

  if (!open) return null

  const today = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })

  function escapeHtml(s: string | null | undefined): string {
    if (s == null) return ''
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function handlePrint() {
    const el = printRef.current
    if (!el) return
    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) return
    win.document.write(`
      <html>
        <head>
          <title>Informe financiero — ${escapeHtml(period)}</title>
          <meta charset="utf-8"/>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, 'Segoe UI', sans-serif; background: #fff; color: #0F172A; padding: 32px; font-size: 13px; }
            h1 { font-size: 22px; font-weight: 900; color: #0F172A; margin-bottom: 2px; }
            h2 { font-size: 14px; font-weight: 800; color: #334155; margin-bottom: 12px; margin-top: 20px; }
            .sub { font-size: 12px; color: #64748B; margin-bottom: 20px; }
            .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
            .stat { border-radius: 12px; padding: 14px; text-align: center; }
            .stat-income  { background: #ECFDF5; border: 1px solid #A7F3D0; }
            .stat-expense { background: #FFF1F2; border: 1px solid #FECDD3; }
            .stat-balance { background: #EEF2FF; border: 1px solid #C7D2FE; }
            .stat-val { font-size: 20px; font-weight: 900; margin-bottom: 2px; }
            .stat-lbl { font-size: 11px; color: #64748B; font-weight: 600; }
            .green  { color: #059669; } .red { color: #E11D48; } .indigo { color: #4F46E5; }
            .cats { margin-bottom: 20px; }
            .cat-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
            .cat-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
            .cat-name { flex: 1; font-size: 12px; font-weight: 600; }
            .cat-bar-bg { flex: 2; height: 6px; background: #F1F5F9; border-radius: 3px; overflow: hidden; }
            .cat-bar { height: 100%; border-radius: 3px; }
            .cat-amt { font-size: 12px; font-weight: 700; width: 80px; text-align: right; }
            .tx-table { width: 100%; border-collapse: collapse; font-size: 12px; }
            .tx-table th { text-align: left; padding: 6px 8px; font-weight: 700; color: #64748B; border-bottom: 1px solid #E2E8F0; background: #F8FAFC; }
            .tx-table td { padding: 7px 8px; border-bottom: 1px solid #F1F5F9; }
            .saving { margin: 12px 0; padding: 10px 14px; border-radius: 10px; background: ${savingRate >= 20 ? '#ECFDF5' : '#FFFBEB'}; border: 1px solid ${savingRate >= 20 ? '#A7F3D0' : '#FDE68A'}; display: flex; justify-content: space-between; align-items: center; }
            .internal-box { margin-bottom: 16px; padding: 10px 14px; border-radius: 10px; background: #F8FAFC; border: 1px solid #E2E8F0; }
            .internal-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; color: #475569; }
            .internal-row:last-child { margin-bottom: 0; }
            .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #E2E8F0; font-size: 10px; color: #94A3B8; text-align: center; }
            .stats { page-break-inside: avoid; }
            .saving { page-break-inside: avoid; }
            .cat-row { page-break-inside: avoid; }
            tr { page-break-inside: avoid; }
            h2 { page-break-after: avoid; }
          </style>
        </head>
        <body>
          <h1>Informe Financiero</h1>
          <div class="sub">Período: ${escapeHtml(period)} · Moneda: ${currency !== 'all' ? escapeHtml(currency) : 'Todas'} · Generado: ${escapeHtml(today)}</div>

          <h2>Resumen financiero real</h2>
          ${statsByCurrency.map(stats => `
            ${currencies.length > 1 ? `<div style="font-size:11px;font-weight:700;color:#64748B;margin:12px 0 4px;">${escapeHtml(stats.currency)}</div>` : ''}
            <div class="stats">
              <div class="stat stat-income"><div class="stat-val green">${formatCurrency(stats.income, stats.currency)}</div><div class="stat-lbl">Ingresos reales</div></div>
              <div class="stat stat-expense"><div class="stat-val red">${formatCurrency(stats.expenses, stats.currency)}</div><div class="stat-lbl">Gastos reales</div></div>
              <div class="stat stat-balance"><div class="stat-val ${stats.balance >= 0 ? 'green' : 'red'}">${formatCurrency(stats.balance, stats.currency)}</div><div class="stat-lbl">Ahorro real</div></div>
            </div>
          `).join('')}

          <div class="saving">
            <span style="font-weight:700;">Tasa de ahorro del período</span>
            <span style="font-weight:900;color:${savingRate >= 20 ? '#059669' : '#D97706'};font-size:16px;">${savingRate}%</span>
          </div>

          ${hasInternalMovements ? `
          <h2>Movimientos internos del período</h2>
          <div class="internal-box">
            ${internalCounts.transfers > 0 ? `<div class="internal-row"><span>Transferencias entre billeteras</span><span style="font-weight:700;">${internalCounts.transfers}</span></div>` : ''}
            ${internalCounts.initialBal > 0 ? `<div class="internal-row"><span>Saldos iniciales registrados</span><span style="font-weight:700;">${internalCounts.initialBal}</span></div>` : ''}
            ${internalCounts.adjustments > 0 ? `<div class="internal-row"><span>Ajustes de saldo</span><span style="font-weight:700;">${internalCounts.adjustments}</span></div>` : ''}
            ${internalCounts.reserves > 0 ? `<div class="internal-row"><span>Movimientos de reservas</span><span style="font-weight:700;">${internalCounts.reserves}</span></div>` : ''}
            <div style="font-size:10px;color:#94A3B8;margin-top:8px;">Estos movimientos no afectan el resumen financiero real.</div>
          </div>
          ` : ''}

          ${yieldByWallet.length > 0 || refundTxs.length > 0 ? `
          <h2>Movimientos especiales</h2>
          ` : ''}

          ${yieldByWallet.length > 0 ? `
          <div style="margin-bottom:16px;padding:10px 14px;border-radius:10px;background:#F5F3FF;border:1px solid #DDD6FE;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-weight:700;color:#6D28D9;">Rendimientos estimados</span>
              <span style="font-weight:900;color:#6D28D9;font-size:15px;">${escapeHtml(formatCurrency(totalYield, yieldByWallet[0]?.currency ?? 'ARS'))}</span>
            </div>
            ${yieldByWallet.map(y => `
            <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748B;margin-top:4px;">
              <span>${escapeHtml(y.walletName)}</span>
              <span style="font-weight:600;">+${escapeHtml(formatCurrency(y.amount, y.currency))}</span>
            </div>`).join('')}
            <div style="font-size:10px;color:#94A3B8;margin-top:8px;">* Los montos son estimados y pueden variar según la tasa real acreditada.</div>
          </div>
          ` : ''}

          ${refundTxs.length > 0 ? `
          <div style="margin-bottom:16px;padding:10px 14px;border-radius:10px;background:#ECFDF5;border:1px solid #A7F3D0;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-weight:700;color:#065F46;">Reintegros acreditados</span>
              <span style="font-weight:900;color:#059669;">${refundTxs.length} · ${escapeHtml(formatCurrency(refundTxs.reduce((s, t) => s + t.amount, 0), refundTxs[0]?.currency ?? 'ARS'))}</span>
            </div>
          </div>
          ` : ''}

          ${topCats.length > 0 ? `
          <h2>Top categorías de gastos</h2>
          <div class="cats">
            ${topCats.map(([name, data]) => {
              const pct = totalExp > 0 ? (data.amount / totalExp) * 100 : 0
              return `
              <div class="cat-row">
                <div class="cat-dot" style="background:${escapeHtml(data.color)}"></div>
                <div class="cat-name">${escapeHtml(name)}</div>
                <div class="cat-bar-bg"><div class="cat-bar" style="width:${pct.toFixed(0)}%;background:${escapeHtml(data.color)}"></div></div>
                <div class="cat-amt">${escapeHtml(formatCurrency(data.amount, data.currency))}</div>
              </div>`
            }).join('')}
          </div>
          ` : ''}

          <h2>Últimas ${recentTx.length} transacciones reales</h2>
          <table class="tx-table">
            <thead><tr><th>Fecha</th><th>Descripción</th><th>Tipo</th><th>Categoría</th><th style="text-align:right">Monto</th></tr></thead>
            <tbody>
              ${recentTx.map(tx => {
                const kindText = tx.transaction_kind
                  ? (KIND_COPY[tx.transaction_kind] ?? tx.transaction_kind)
                  : (tx.label ? (LABEL_COPY[tx.label] ?? tx.label) : '—')
                return `
              <tr>
                <td>${escapeHtml(tx.date.substring(0, 10))}</td>
                <td>${escapeHtml(tx.description)}</td>
                <td style="font-size:11px;color:#6d3bd7;">${escapeHtml(kindText)}</td>
                <td>${escapeHtml(tx.category_name ?? '—')}</td>
                <td style="text-align:right;color:${tx.type === 'income' ? '#059669' : '#E11D48'};font-weight:700;">
                  ${tx.type === 'income' ? '+' : '-'}${escapeHtml(formatCurrency(tx.amount, tx.currency))}
                </td>
              </tr>`
              }).join('')}
            </tbody>
          </table>

          <div class="footer">${realTxs.length} movimientos reales · ${transactions.length - realTxs.length} internos excluidos · Generado por Equal · ${escapeHtml(today)}</div>
        </body>
      </html>
    `)
    win.document.close()
    setTimeout(() => { win.print() }, 400)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        className="relative w-full max-w-lg rounded-3xl animate-fade-in overflow-y-auto"
        style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-xl)', maxHeight: 'calc(100vh - 2rem)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border-light)' }}
        >
          <div>
            <h2 id="report-modal-title" className="font-extrabold text-base" style={{ color: 'var(--text-primary)' }}>
              Informe del período
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{period}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar informe"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-black/5"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Vista previa del resumen */}
        <div className="p-6 space-y-4">
          {/* Stats — solo movimientos reales */}
          <div className="space-y-2">
            {statsByCurrency.map(stats => (
              <div key={stats.currency}>
                {currencies.length > 1 && (
                  <p className="text-[10px] font-bold mb-1" style={{ color: 'var(--text-faint)' }}>{stats.currency}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Ingresos reales', value: stats.income,   color: 'var(--income-600)',  bg: 'var(--income-50)'  },
                    { label: 'Gastos reales',   value: stats.expenses, color: 'var(--expense-600)', bg: 'var(--expense-50)' },
                    { label: 'Ahorro real',     value: stats.balance,  color: stats.balance >= 0 ? 'var(--income-600)' : 'var(--expense-600)', bg: 'var(--brand-50)' },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: s.bg }}>
                      <p className="text-base font-extrabold tabular-nums" style={{ color: s.color }}>
                        {formatCurrency(s.value, stats.currency)}
                      </p>
                      <p className="text-xs mt-0.5 font-semibold" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Tasa ahorro */}
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: savingRate >= 20 ? 'var(--income-50)' : '#FFFBEB', border: `1px solid ${savingRate >= 20 ? 'var(--income-100)' : '#FDE68A'}` }}
          >
            <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
              Tasa de ahorro
            </span>
            <span className="text-xl font-extrabold" style={{ color: savingRate >= 20 ? 'var(--income-600)' : '#D97706' }}>
              {savingRate}%
            </span>
          </div>

          {/* Movimientos internos */}
          {hasInternalMovements && (
            <div className="rounded-xl p-3 space-y-1" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
              <p className="text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>Movimientos internos</p>
              {internalCounts.transfers > 0 && (
                <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>Transferencias</span><span className="font-bold">{internalCounts.transfers}</span>
                </div>
              )}
              {internalCounts.initialBal > 0 && (
                <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>Saldos iniciales</span><span className="font-bold">{internalCounts.initialBal}</span>
                </div>
              )}
              {internalCounts.adjustments > 0 && (
                <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>Ajustes de saldo</span><span className="font-bold">{internalCounts.adjustments}</span>
                </div>
              )}
              {internalCounts.reserves > 0 && (
                <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>Movimientos de reservas</span><span className="font-bold">{internalCounts.reserves}</span>
                </div>
              )}
            </div>
          )}

          {/* Rendimientos */}
          {yieldByWallet.length > 0 && (
            <div className="rounded-xl p-3 space-y-1.5" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold" style={{ color: '#6D28D9' }}>Rendimientos del período</p>
                <p className="text-sm font-extrabold tabular-nums" style={{ color: '#6D28D9' }}>
                  +{formatCurrency(totalYield, yieldByWallet[0]?.currency ?? 'ARS')}
                </p>
              </div>
              {yieldByWallet.slice(0, 3).map(y => (
                <div key={y.walletName} className="flex items-center justify-between text-xs" style={{ color: '#7C3AED' }}>
                  <span className="truncate">{y.walletName}</span>
                  <span className="font-semibold tabular-nums ml-2">+{formatCurrency(y.amount, y.currency)}</span>
                </div>
              ))}
              <p className="text-[10px]" style={{ color: '#94A3B8' }}>* Montos estimados</p>
            </div>
          )}

          {/* Reintegros acreditados */}
          {refundTxs.length > 0 && (
            <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: 'var(--income-50)', border: '1px solid var(--income-100)' }}>
              <span className="text-xs font-bold" style={{ color: 'var(--income-700)' }}>Reintegros acreditados</span>
              <span className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--income-600)' }}>
                {refundTxs.length} · +{formatCurrency(refundTxs.reduce((s, t) => s + t.amount, 0), refundTxs[0]?.currency ?? 'ARS')}
              </span>
            </div>
          )}

          {/* Top categorías */}
          {topCats.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Top categorías de gastos</p>
              {topCats.slice(0, 3).map(([name, data]) => {
                const pct = totalExp > 0 ? (data.amount / totalExp) * 100 : 0
                return (
                  <div key={name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: data.color }} />
                    <span className="text-xs flex-1 truncate font-medium" style={{ color: 'var(--text-secondary)' }}>{name}</span>
                    <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: data.color }} />
                    </div>
                    <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          <p className="text-xs text-center" style={{ color: 'var(--text-faint)' }}>
            {realTxs.length} movimientos reales · {transactions.length} total · generado {today}
          </p>
        </div>

        {/* Botón imprimir */}
        <div className="px-6 pb-6">
          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-extrabold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)', boxShadow: 'var(--shadow-brand)' }}
          >
            <Printer size={18} /> Exportar / Imprimir PDF
          </button>
        </div>
      </div>
    </div>
  )
}
