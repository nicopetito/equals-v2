'use client'

import { useState, useEffect, useMemo } from 'react'
import { Activity, CheckCircle2, AlertTriangle, XCircle, Copy, RefreshCw } from 'lucide-react'
import { PageHeader }         from '@/components/ui/PageHeader'
import { useTransactions }    from '@/hooks/useTransactions'
import { useWallets }         from '@/hooks/useWallets'
import { useCategories }      from '@/hooks/useCategories'
import { useBudgets }         from '@/hooks/useBudgets'
import { useRefunds }         from '@/hooks/useRefunds'
import { recurringService }   from '@/services/recurring.service'
import { useToast }           from '@/components/providers/ToastProvider'
import type { RecurringTransactionWithDetails } from '@/types'

// ─── types ────────────────────────────────────────────────────────────────────

type CheckStatus = 'ok' | 'warning' | 'critical'

interface HealthCheck {
  id:      string
  label:   string
  status:  CheckStatus
  count:   number
  detail:  string
  link?:   string
  linkLabel?: string
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const now = new Date()

function statusIcon(status: CheckStatus) {
  if (status === 'ok')       return <CheckCircle2 size={18} style={{ color: 'var(--income-600)' }} />
  if (status === 'warning')  return <AlertTriangle size={18} style={{ color: '#D97706' }} />
  return <XCircle size={18} style={{ color: 'var(--expense-600)' }} />
}

function statusBg(status: CheckStatus) {
  if (status === 'ok')      return { bg: 'var(--income-50)',  border: 'var(--income-200)',  text: 'var(--income-600)' }
  if (status === 'warning') return { bg: '#FFFBEB',            border: '#FDE68A',            text: '#92400E' }
  return                           { bg: 'var(--expense-50)', border: 'var(--expense-200)', text: 'var(--expense-700)' }
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function HealthPage() {
  const { data: transactions, loading: loadingTx }       = useTransactions()
  const { data: wallets, loading: loadingWallets }       = useWallets()
  const { data: categories }                             = useCategories()
  const { data: budgets, loading: loadingBudgets }       = useBudgets(now.getMonth() + 1, now.getFullYear())
  const { items: refunds }                               = useRefunds()
  const { addToast }            = useToast()

  const [recurring, setRecurring]   = useState<RecurringTransactionWithDetails[]>([])
  const [loadingRec, setLoadingRec] = useState(true)
  const [copied, setCopied]         = useState(false)

  useEffect(() => {
    recurringService.list()
      .then(setRecurring)
      .catch(() => setRecurring([]))
      .finally(() => setLoadingRec(false))
  }, [])

  const walletIds = useMemo(() => new Set((wallets ?? []).map(w => w.id!)), [wallets])
  const categoryIds = useMemo(() => new Set((categories ?? []).map(c => c.id!)), [categories])
  const sinCategoriaIds = useMemo(
    () => new Set((categories ?? []).filter(c => c.is_system).map(c => c.id!)),
    [categories]
  )

  const checks = useMemo<HealthCheck[]>(() => {
    // 1. Transacciones huérfanas (wallet_id null o billetera inexistente)
    const orphans = transactions.filter(t =>
      !t.wallet_id || !walletIds.has(t.wallet_id)
    )

    // 2. Transacciones sin clasificar (histórico): sin category_id o con categoría de sistema
    const uncategorized = transactions.filter(t =>
      !t.category_id || sinCategoriaIds.has(t.category_id)
    )

    // 3. Transacciones con categoría eliminada (category_id existe pero no está en categories)
    const deletedCategoryTx = transactions.filter(t =>
      t.category_id && !categoryIds.has(t.category_id)
    )

    // 4. Operaciones recurrentes con billetera inválida
    const invalidWalletRec = recurring.filter(r =>
      r.wallet_id && !walletIds.has(r.wallet_id)
    )

    // 5. Presupuestos con categoría eliminada
    const deletedCategoryBudgets = budgets.filter(b =>
      !b.category_name && b.category_id
    )

    // 6. Reintegros pendientes vencidos (created_at > 90 días)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const overdueRefunds = refunds.filter(r => {
      if (r.status !== 'pending') return false
      try { return new Date(r.created_at) < ninetyDaysAgo }
      catch { return false }
    })

    return [
      {
        id:       'orphans',
        label:    'Transacciones huérfanas',
        status:   orphans.length > 0 ? 'critical' : 'ok',
        count:    orphans.length,
        detail:   orphans.length > 0
          ? `${orphans.length} transacción${orphans.length > 1 ? 'es' : ''} sin billetera válida`
          : 'Sin transacciones huérfanas',
        link:      orphans.length > 0 ? '/transactions?orphan=true' : undefined,
        linkLabel: 'Ver huérfanas →',
      },
      {
        id:       'uncategorized',
        label:    'Transacciones sin clasificar',
        status:   uncategorized.length > 0 ? 'warning' : 'ok',
        count:    uncategorized.length,
        detail:   uncategorized.length > 0
          ? `${uncategorized.length} transacción${uncategorized.length > 1 ? 'es' : ''} sin clasificar. Impactan tus balances, pero conviene categorizarlas para mejorar tus estadísticas y presupuestos.`
          : 'Todas las transacciones tienen categoría asignada',
        link:      uncategorized.length > 0 ? '/transactions' : undefined,
        linkLabel: 'Ver transacciones →',
      },
      {
        id:       'deleted_category_tx',
        label:    'Transacciones con categoría eliminada',
        status:   deletedCategoryTx.length > 0 ? 'warning' : 'ok',
        count:    deletedCategoryTx.length,
        detail:   deletedCategoryTx.length > 0
          ? `${deletedCategoryTx.length} transacción${deletedCategoryTx.length > 1 ? 'es' : ''} referencian categorías eliminadas`
          : 'Sin referencias a categorías eliminadas',
      },
      {
        id:       'invalid_wallet_recurring',
        label:    'Operaciones recurrentes con billetera inválida',
        status:   invalidWalletRec.length > 0 ? 'critical' : 'ok',
        count:    invalidWalletRec.length,
        detail:   invalidWalletRec.length > 0
          ? `${invalidWalletRec.length} operación${invalidWalletRec.length > 1 ? 'es' : ''} recurrente${invalidWalletRec.length > 1 ? 's' : ''} con billetera inexistente`
          : 'Todas las operaciones recurrentes tienen billetera válida',
        link:      invalidWalletRec.length > 0 ? '/scheduled' : undefined,
        linkLabel: 'Ver programadas →',
      },
      {
        id:       'deleted_category_budgets',
        label:    'Presupuestos con categoría eliminada',
        status:   deletedCategoryBudgets.length > 0 ? 'warning' : 'ok',
        count:    deletedCategoryBudgets.length,
        detail:   deletedCategoryBudgets.length > 0
          ? `${deletedCategoryBudgets.length} presupuesto${deletedCategoryBudgets.length > 1 ? 's' : ''} con categoría eliminada`
          : 'Todos los presupuestos tienen categoría válida',
        link:      deletedCategoryBudgets.length > 0 ? '/budgets' : undefined,
        linkLabel: 'Ver presupuestos →',
      },
      {
        id:       'overdue_refunds',
        label:    'Reintegros pendientes vencidos (+90 días)',
        status:   overdueRefunds.length > 0 ? 'warning' : 'ok',
        count:    overdueRefunds.length,
        detail:   overdueRefunds.length > 0
          ? `${overdueRefunds.length} reintegro${overdueRefunds.length > 1 ? 's' : ''} pendiente${overdueRefunds.length > 1 ? 's' : ''} con más de 90 días`
          : 'Sin reintegros pendientes vencidos',
      },
    ]
  }, [transactions, walletIds, categoryIds, sinCategoriaIds, budgets, refunds, recurring])

  const criticalCount = checks.filter(c => c.status === 'critical').length
  const warningCount  = checks.filter(c => c.status === 'warning').length
  const allOk         = criticalCount === 0 && warningCount === 0

  const overallStatus: CheckStatus = criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'ok'

  function buildDiagnosis(): string {
    const lines: string[] = [
      `=== Diagnóstico del sistema — equal ===`,
      `Fecha: ${new Date().toLocaleString('es-AR')}`,
      ``,
      `Estado general: ${allOk ? 'OK' : criticalCount > 0 ? `CRÍTICO (${criticalCount} críticos, ${warningCount} advertencias)` : `ADVERTENCIA (${warningCount} advertencias)`}`,
      ``,
    ]
    checks.forEach(c => {
      const icon = c.status === 'ok' ? '✅' : c.status === 'warning' ? '⚠️' : '❌'
      lines.push(`${icon} ${c.label}`)
      lines.push(`   ${c.detail}`)
      lines.push(`   Conteo: ${c.count}`)
      lines.push(``)
    })
    lines.push(`Datos:`)
    lines.push(`  Transacciones: ${transactions.length}`)
    lines.push(`  Billeteras: ${wallets.length}`)
    lines.push(`  Categorías: ${categories.length}`)
    lines.push(`  Presupuestos: ${budgets.length}`)
    lines.push(`  Reintegros: ${refunds.length}`)
    lines.push(`  Operaciones recurrentes: ${recurring.length}`)
    return lines.join('\n')
  }

  async function handleCopyDiagnosis() {
    try {
      await navigator.clipboard.writeText(buildDiagnosis())
      setCopied(true)
      addToast('Diagnóstico copiado al portapapeles', 'success')
      setTimeout(() => setCopied(false), 3000)
    } catch {
      addToast('No se pudo copiar al portapapeles', 'error')
    }
  }

  const isLoading = loadingRec || loadingTx || loadingWallets || loadingBudgets

  return (
    <div className="p-5 md:p-7 max-w-3xl mx-auto space-y-5 animate-fade-in">

      <PageHeader
        layout="split"
        title="Salud del sistema"
        subtitle="Diagnóstico de integridad de datos"
        icon={Activity}
        color="#a78bfa"
      >
        <button
          onClick={handleCopyDiagnosis}
          disabled={isLoading}
          className="hero-btn hero-btn-secondary hero-btn-sm"
        >
          <Copy size={13} />
          {copied ? 'Copiado' : 'Copiar diagnóstico'}
        </button>
      </PageHeader>

      {/* Overall status */}
      <div
        className="flex items-center gap-3 rounded-2xl px-5 py-4"
        style={{
          background: statusBg(overallStatus).bg,
          border: `1px solid ${statusBg(overallStatus).border}`,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {statusIcon(overallStatus)}
        <div>
          <p className="font-bold text-sm" style={{ color: statusBg(overallStatus).text }}>
            {allOk
              ? 'Sistema saludable — sin problemas detectados'
              : criticalCount > 0
                ? `${criticalCount} problema${criticalCount > 1 ? 's' : ''} crítico${criticalCount > 1 ? 's' : ''} detectado${criticalCount > 1 ? 's' : ''}`
                : `${warningCount} advertencia${warningCount > 1 ? 's' : ''} detectada${warningCount > 1 ? 's' : ''}`
            }
          </p>
          {!allOk && (
            <p className="text-xs mt-0.5" style={{ color: statusBg(overallStatus).text, opacity: 0.8 }}>
              Revisá los detalles a continuación para resolver cada problema.
            </p>
          )}
        </div>
        {isLoading && (
          <RefreshCw size={14} className="ml-auto animate-spin" style={{ color: 'var(--text-muted)' }} />
        )}
      </div>

      {/* Check list */}
      {allOk ? (
        <div
          className="rounded-2xl px-5 py-4 flex items-center gap-3"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--income-50)' }}>
            <CheckCircle2 size={16} style={{ color: 'var(--income-500)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {checks.length} comprobaciones pasadas
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Sin huérfanas, sin categorías inválidas, sin reintegros vencidos. Todo en orden.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {checks.map(check => {
            const styles = statusBg(check.status)
            return (
              <div
                key={check.id}
                className="rounded-2xl px-5 py-4 flex items-start gap-3"
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${check.status !== 'ok' ? styles.border : 'var(--border)'}`,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ marginTop: '1px', flexShrink: 0 }}>
                  {statusIcon(check.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {check.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: check.status !== 'ok' ? styles.text : 'var(--text-muted)' }}>
                    {check.detail}
                  </p>
                </div>
                {check.link && (
                  <a
                    href={check.link}
                    className="text-xs font-bold whitespace-nowrap mt-0.5"
                    style={{ color: 'var(--brand-500)', textDecoration: 'underline', flexShrink: 0 }}
                  >
                    {check.linkLabel}
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Data summary */}
      <div
        className="rounded-2xl px-5 py-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
          Resumen de datos cargados
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: 'Transacciones',  value: transactions.length },
            { label: 'Billeteras',     value: wallets.length },
            { label: 'Categorías',     value: categories.length },
            { label: 'Presupuestos',   value: budgets.length },
            { label: 'Reintegros',     value: refunds.length },
            { label: 'Recurrentes',    value: recurring.length },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-lg font-extrabold" style={{ color: 'var(--brand-500)', fontFamily: 'var(--font-sora)' }}>
                {s.value}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
