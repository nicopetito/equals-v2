import { createClient } from '@/lib/supabase/client'

export interface Budget {
  id: string
  category_id: string
  category_name: string
  category_color: string
  amount: number
  currency: string
  month: string // 'YYYY-MM'
}

function storageKey(userId: string, month: string) {
  return `eq_budgets_${userId}_${month}`
}

async function getUserId(): Promise<string | null> {
  const { data } = await createClient().auth.getUser()
  return data.user?.id ?? null
}

export const budgetsService = {
  async list(month: string): Promise<Budget[]> {
    const userId = await getUserId()
    if (!userId) return []
    const raw = localStorage.getItem(storageKey(userId, month))
    return raw ? (JSON.parse(raw) as Budget[]) : []
  },

  async upsert(month: string, budget: Omit<Budget, 'id'> & { id?: string }): Promise<void> {
    const userId = await getUserId()
    if (!userId) return
    const existing = await this.list(month)
    const id  = budget.id ?? crypto.randomUUID()
    const idx = existing.findIndex(b => b.category_id === budget.category_id)
    if (idx >= 0) existing[idx] = { ...budget, id }
    else existing.push({ ...budget, id })
    localStorage.setItem(storageKey(userId, month), JSON.stringify(existing))
  },

  async delete(month: string, categoryId: string): Promise<void> {
    const userId = await getUserId()
    if (!userId) return
    const existing = await this.list(month)
    localStorage.setItem(
      storageKey(userId, month),
      JSON.stringify(existing.filter(b => b.category_id !== categoryId))
    )
  },

  // Copiar presupuestos de un mes anterior al mes actual
  async copyFromMonth(sourceMonth: string, targetMonth: string): Promise<void> {
    const userId = await getUserId()
    if (!userId) return
    const source = await this.list(sourceMonth)
    if (source.length === 0) return
    const updated = source.map(b => ({ ...b, id: crypto.randomUUID(), month: targetMonth }))
    localStorage.setItem(storageKey(userId, targetMonth), JSON.stringify(updated))
  },
}
