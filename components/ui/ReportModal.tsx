'use client'

import { useRef } from 'react'
import { X, Printer, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { TransactionWithDetails } from '@/types'
import { formatCurrency } from '@/utils/format'
import { formatDate } from '@/utils/date'

interface Props {
  open: boolean
  onClose: () => void
  transactions: TransactionWithDetails[]
  period: string
  currency: string
}

export function ReportModal({ open, onClose, transactions, period, currency }: Props) {
  const printRef = useRef<HTMLDivElement>(null)

  if (!open) return null

  const income   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance  = income - expenses
  const savingRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0

  // Top 5 categorías de gastos
  const catMap = new Map<string, { amount: number; color: string }>()
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const name = t.category_name ?? 'Sin categoría'
    const entry = catMap.get(name) ?? { amount: 0, color: t.category_color ?? '#6366F1' }
    entry.amount += t.amount
    catMap.set(name, entry)
  })
  const topCats = Array.from(catMap.entries())
    .sort(([, a], [, b]) => b.amount - a.amount)
    .slice(0, 5)
  const totalExp = topCats.reduce((s, [, v]) => s + v.amount, 0)

  const recentTx = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 15)

  const today = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })

  function handlePrint() {
    const el = printRef.current
    if (!el) return
    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) return
    win.document.write(`
      <html>
        <head>
          <title>Informe financiero — ${period}</title>
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
            .cat-dot { width: 10px; height: 10px; border-radius: 50%; shrink: 0; flex-shrink: 0; }
            .cat-name { flex: 1; font-size: 12px; font-weight: 600; }
            .cat-bar-bg { flex: 2; height: 6px; background: #F1F5F9; border-radius: 3px; overflow: hidden; }
            .cat-bar { height: 100%; border-radius: 3px; }
            .cat-amt { font-size: 12px; font-weight: 700; width: 80px; text-align: right; }
            .tx-table { width: 100%; border-collapse: collapse; font-size: 12px; }
            .tx-table th { text-align: left; padding: 6px 8px; font-weight: 700; color: #64748B; border-bottom: 1px solid #E2E8F0; background: #F8FAFC; }
            .tx-table td { padding: 7px 8px; border-bottom: 1px solid #F1F5F9; }
            .saving { margin: 12px 0; padding: 10px 14px; border-radius: 10px; background: ${savingRate >= 20 ? '#ECFDF5' : '#FFFBEB'}; border: 1px solid ${savingRate >= 20 ? '#A7F3D0' : '#FDE68A'}; display: flex; justify-content: space-between; align-items: center; }
            .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #E2E8F0; font-size: 10px; color: #94A3B8; text-align: center; }
          </style>
        </head>
        <body>
          <h1>Informe Financiero</h1>
          <div class="sub">Período: ${period} · Moneda: ${currency !== 'all' ? currency : 'Todas'} · Generado: ${today}</div>

          <div class="stats">
            <div class="stat stat-income"><div class="stat-val green">${formatCurrency(income, currency === 'all' ? 'ARS' : currency)}</div><div class="stat-lbl">Ingresos</div></div>
            <div class="stat stat-expense"><div class="stat-val red">${formatCurrency(expenses, currency === 'all' ? 'ARS' : currency)}</div><div class="stat-lbl">Gastos</div></div>
            <div class="stat stat-balance"><div class="stat-val ${balance >= 0 ? 'green' : 'red'}">${formatCurrency(balance, currency === 'all' ? 'ARS' : currency)}</div><div class="stat-lbl">Balance</div></div>
          </div>

          <div class="saving">
            <span style="font-weight:700;">Tasa de ahorro del período</span>
            <span style="font-weight:900;color:${savingRate >= 20 ? '#059669' : '#D97706'};font-size:16px;">${savingRate}%</span>
          </div>

          ${topCats.length > 0 ? `
          <h2>Top categorías de gastos</h2>
          <div class="cats">
            ${topCats.map(([name, data]) => {
              const pct = totalExp > 0 ? (data.amount / totalExp) * 100 : 0
              return `
              <div class="cat-row">
                <div class="cat-dot" style="background:${data.color}"></div>
                <div class="cat-name">${name}</div>
                <div class="cat-bar-bg"><div class="cat-bar" style="width:${pct.toFixed(0)}%;background:${data.color}"></div></div>
                <div class="cat-amt">${formatCurrency(data.amount, 'ARS')}</div>
              </div>`
            }).join('')}
          </div>
          ` : ''}

          <h2>Últimas ${recentTx.length} transacciones</h2>
          <table class="tx-table">
            <thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th style="text-align:right">Monto</th></tr></thead>
            <tbody>
              ${recentTx.map(tx => `
              <tr>
                <td>${tx.date.substring(0, 10)}</td>
                <td>${tx.description}</td>
                <td>${tx.category_name ?? '—'}</td>
                <td style="text-align:right;color:${tx.type === 'income' ? '#059669' : '#E11D48'};font-weight:700;">
                  ${tx.type === 'income' ? '+' : '−'}${formatCurrency(tx.amount, tx.currency)}
                </td>
              </tr>`).join('')}
            </tbody>
          </table>

          <div class="footer">Generado por Equals · finanzas personales · ${today}</div>
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
    >
      <div
        className="relative w-full max-w-lg rounded-3xl animate-fade-in"
        style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-xl)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border-light)' }}
        >
          <div>
            <h2 className="font-extrabold text-base" style={{ color: 'var(--text-primary)' }}>
              Informe del período
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{period}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-slate-100"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Vista previa del resumen */}
        <div className="p-6 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Ingresos',  value: income,   color: 'var(--income-600)',  bg: 'var(--income-50)',  icon: TrendingUp },
              { label: 'Gastos',    value: expenses, color: 'var(--expense-600)', bg: 'var(--expense-50)', icon: TrendingDown },
              { label: 'Balance',   value: balance,  color: balance >= 0 ? 'var(--income-600)' : 'var(--expense-600)', bg: 'var(--brand-50)', icon: Wallet },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: s.bg }}>
                <p className="text-base font-extrabold tabular-nums" style={{ color: s.color }}>
                  {formatCurrency(s.value, currency === 'all' ? 'ARS' : currency)}
                </p>
                <p className="text-xs mt-0.5 font-semibold" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
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
            El informe incluye {transactions.length} transacciones · generado {today}
          </p>
        </div>

        {/* Botón imprimir */}
        <div className="px-6 pb-6">
          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-extrabold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'var(--grad-brand)', boxShadow: 'var(--shadow-brand)' }}
          >
            <Printer size={18} /> Exportar / Imprimir PDF
          </button>
        </div>
      </div>
    </div>
  )
}
