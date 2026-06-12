'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Activity, CheckCircle2, AlertTriangle, XCircle, Copy, RefreshCw, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { PageHeader }         from '@/components/ui/PageHeader'
import { EmptyState }         from '@/components/ui/EmptyState'
import { useTransactions }    from '@/hooks/useTransactions'
import { useWallets }         from '@/hooks/useWallets'
import { useCategories }      from '@/hooks/useCategories'
import { useBudgets }         from '@/hooks/useBudgets'
import { useRefunds }         from '@/hooks/useRefunds'
import { recurringService }    from '@/services/recurring.service'
import { transactionsService } from '@/services/transactions.service'
import { useToast }           from '@/components/providers/ToastProvider'
import { formatCurrency }     from '@/utils/format'
import type { RecurringTransactionWithDetails, TransactionWithDetails } from '@/types'

type DiagDetailType = Parameters<typeof transactionsService.getDiagnosticDetails>[0]

type DiagResult = Awaited<ReturnType<typeof transactionsService.runFinancialDiagnostics>>

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
  const router = useRouter()
  const { data: transactions, loading: loadingTx }       = useTransactions()
  const { data: wallets, loading: loadingWallets }       = useWallets()
  const { data: categories }                             = useCategories()
  const { data: budgets, loading: loadingBudgets }       = useBudgets(now.getMonth() + 1, now.getFullYear())
  const { items: refunds }                               = useRefunds()
  const { addToast }            = useToast()

  const [recurring, setRecurring]   = useState<RecurringTransactionWithDetails[]>([])
  const [loadingRec, setLoadingRec] = useState(true)
  const [copied, setCopied]         = useState(false)
  const [diagResult, setDiagResult] = useState<DiagResult>(null)
  const [loadingDiag, setLoadingDiag] = useState(true)
  const [expandedDiag, setExpandedDiag] = useState<Set<string>>(new Set())
  const [diagDetails, setDiagDetails]   = useState<Record<string, TransactionWithDetails[]>>({})
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set())

  const DIAG_DETAIL_TYPES: Record<string, DiagDetailType | null> = {
    null_kind:           'null_kind',
    transfer_no_group:   'transfer_no_group',
    zero_adjustment:     'zero_adjustment',
    multi_initial_balance: 'multi_initial_balance',
    orphan_refund_credit:  'orphan_refund_credit',
    unbalanced_groups:   null,
    missing_leg:         null,
  }

  const DIAG_HISTORY_LINKS: Record<string, string | null> = {
    null_kind:             null,
    transfer_no_group:     '/transactions',
    zero_adjustment:       '/transactions',
    multi_initial_balance: '/transactions',
    orphan_refund_credit:  '/transactions',
    unbalanced_groups:     '/transactions',
    missing_leg:           '/transactions',
  }

  async function fetchDiagDetails(id: string) {
    const detailType = DIAG_DETAIL_TYPES[id]
    if (!detailType) return
    if (diagDetails[id]) {
      setExpandedDiag(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
      return
    }
    setLoadingDetails(prev => new Set(prev).add(id))
    setExpandedDiag(prev => new Set(prev).add(id))
    try {
      const rows = await transactionsService.getDiagnosticDetails(detailType)
      setDiagDetails(prev => ({ ...prev, [id]: rows }))
    } catch {
      setDiagDetails(prev => ({ ...prev, [id]: [] }))
    } finally {
      setLoadingDetails(prev => { const next = new Set(prev); next.delete(id); return next })
    }
  }

  useEffect(() => {
    transactionsService.runFinancialDiagnostics()
      .then(setDiagResult)
      .catch(() => setDiagResult(null))
      .finally(() => setLoadingDiag(false))
  }, [])

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
    if (diagResult) {
      lines.push(`Diagnóstico financiero avanzado (JSON):`)
      lines.push(JSON.stringify(diagResult, null, 2))
      lines.push(``)
    }
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

  const diagChecks = useMemo<HealthCheck[]>(() => {
    if (!diagResult) return []
    const d = diagResult

    const entry = (
      id: string,
      label: string,
      count: number,
      severity: CheckStatus,
      okDetail: string,
      badDetail: (n: number) => string,
    ): HealthCheck => ({
      id,
      label,
      status: count > 0 ? severity : 'ok',
      count,
      detail: count > 0 ? badDetail(count) : okDetail,
    })

    return [
      entry('null_kind', 'Transacciones sin transaction_kind',
        d.null_kind, 'warning',
        'Todas las transacciones tienen transaction_kind.',
        n => `${n} transacción${n>1?'es':''} sin transaction_kind. Anteriores a migración 037.`),
      entry('transfer_no_group', 'Transferencias sin transfer_group_id',
        d.transfer_no_group, 'critical',
        'Todas las transferencias tienen transfer_group_id.',
        n => `${n} transacción${n>1?'es':''} de tipo transfer sin transfer_group_id. No vinculables a su par.`),
      entry('unbalanced_groups', 'Grupos de transferencia con legs != 2',
        d.unbalanced_groups, 'critical',
        'Todos los grupos de transferencia tienen exactamente 2 legs.',
        n => `${n} grupo${n>1?'s':''} con cantidad de legs distinta de 2 (duplicadas o eliminadas).`),
      entry('missing_leg', 'Transferencias con leg faltante',
        d.missing_leg, 'critical',
        'Todos los grupos tienen leg expense + leg income.',
        n => `${n} grupo${n>1?'s':''} sin leg de egreso o sin leg de ingreso.`),
      entry('multi_initial_balance', 'Billeteras con saldo inicial duplicado',
        d.multi_initial_balance, 'warning',
        'Sin billeteras con saldo inicial duplicado.',
        n => `${n} billetera${n>1?'s':''} con más de un initial_balance registrado.`),
      entry('zero_adjustment', 'Ajustes de saldo con monto cero',
        d.zero_adjustment, 'warning',
        'Sin ajustes de saldo con monto cero.',
        n => `${n} ajuste${n>1?'s':''} de saldo con amount = 0.`),
      entry('orphan_refund_credit', 'Reintegros acreditados sin referencia',
        d.orphan_refund_credit, 'warning',
        'Todos los reintegros acreditados tienen referencia en tabla refunds.',
        n => `${n} transacción${n>1?'es':''} refund_credit sin fila acreditada en tabla refunds.`),
    ]
  }, [diagResult])

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

      {/* Empty state para usuario sin transacciones */}
      {!isLoading && transactions.length === 0 && (
        <EmptyState
          type="transactions"
          title="No hay datos para analizar"
          description="Registrá algunas transacciones para ver la salud de tus finanzas."
          action={{ label: 'Ir a Transacciones', onClick: () => router.push('/transactions') }}
        />
      )}

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

      {/* Diagnóstico de integridad financiera */}
      <div>
        <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          Diagnóstico financiero avanzado
        </p>
        {loadingDiag ? (
          <div className="rounded-2xl px-5 py-4 flex items-center gap-2"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <RefreshCw size={14} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Verificando integridad…</span>
          </div>
        ) : !diagResult ? (
          <div className="rounded-2xl px-5 py-4"
            style={{ background: 'var(--expense-50)', border: '1px solid var(--expense-200)', boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--expense-700)' }}>
              No se pudo cargar el diagnóstico financiero.
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--expense-600)' }}>
              Verificá que la migración 047 esté aplicada en Supabase.
            </p>
          </div>
        ) : diagChecks.every(c => c.status === 'ok') ? (
          <div className="rounded-2xl px-5 py-4 flex items-center gap-3"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--income-50)' }}>
              <CheckCircle2 size={16} style={{ color: 'var(--income-500)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {diagChecks.length} verificaciones financieras pasadas
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Sin inconsistencias en transferencias, saldos iniciales ni reintegros.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {diagChecks.map(check => {
              const styles = statusBg(check.status)
              const canExpand = check.count > 0 && DIAG_DETAIL_TYPES[check.id] !== null
              const historyLink = check.count > 0 ? DIAG_HISTORY_LINKS[check.id] : null
              const isExpanded = expandedDiag.has(check.id)
              const isLoadingDetails = loadingDetails.has(check.id)
              const details = diagDetails[check.id] ?? []

              return (
                <div
                  key={check.id}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: 'var(--bg-card)',
                    border: `1px solid ${check.status !== 'ok' ? styles.border : 'var(--border)'}`,
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div className="px-5 py-4 flex items-start gap-3">
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
                      {check.count > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {canExpand && (
                            <button
                              onClick={() => fetchDiagDetails(check.id)}
                              className="flex items-center gap-1 text-xs font-semibold transition-colors"
                              style={{ color: 'var(--brand-500)' }}
                            >
                              {isLoadingDetails
                                ? <RefreshCw size={11} className="animate-spin" />
                                : isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />
                              }
                              {isExpanded ? 'Ocultar detalles' : 'Ver detalles'}
                            </button>
                          )}
                          {historyLink && (
                            <Link
                              href={historyLink}
                              className="flex items-center gap-1 text-xs font-semibold transition-colors"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              <ExternalLink size={11} />
                              Ir al historial
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${styles.border}` }}>
                      {isLoadingDetails ? (
                        <div className="px-5 py-3 flex items-center gap-2">
                          <RefreshCw size={12} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Cargando detalles…</span>
                        </div>
                      ) : details.length === 0 ? (
                        <p className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>Sin registros encontrados.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[480px] text-[11px]">
                            <thead>
                              <tr style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}>
                                <th className="px-4 py-2 text-left font-semibold">Fecha</th>
                                <th className="px-4 py-2 text-left font-semibold">Descripción</th>
                                <th className="px-4 py-2 text-right font-semibold">Monto</th>
                                <th className="px-4 py-2 text-left font-semibold">Billetera</th>
                                <th className="px-4 py-2 text-left font-semibold">Kind</th>
                                <th className="px-4 py-2 text-left font-semibold">Group ID</th>
                              </tr>
                            </thead>
                            <tbody>
                              {details.map(tx => (
                                <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                                  <td className="px-4 py-2 whitespace-nowrap">{tx.date}</td>
                                  <td className="px-4 py-2 max-w-[160px] truncate">{tx.description ?? '—'}</td>
                                  <td className="px-4 py-2 text-right whitespace-nowrap tabular-nums font-semibold">
                                    {formatCurrency(tx.amount, tx.currency)}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap">{tx.wallet_name ?? '—'}</td>
                                  <td className="px-4 py-2 whitespace-nowrap font-mono" style={{ color: 'var(--brand-500)' }}>
                                    {tx.transaction_kind ?? '—'}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap font-mono" style={{ color: 'var(--text-faint)' }}>
                                    {tx.transfer_group_id ? tx.transfer_group_id.slice(0, 8) + '…' : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {details.length >= 50 && (
                            <p className="px-4 py-2 text-[10px]" style={{ color: 'var(--text-faint)' }}>
                              Mostrando hasta 50 registros. Usá el historial para ver todos.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Data summary */}
      <div
        className="rounded-2xl px-5 py-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
          Resumen de datos cargados
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
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
