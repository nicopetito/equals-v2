import type { Category } from '@/types'

export type Confidence = 'high' | 'medium' | 'low' | 'none'

export interface CategorySuggestion {
  categoryId: string | null
  confidence: Confidence
  matchedRule: string | null
}

export interface LearnedRule {
  descriptionKey: string
  categoryId: string
  learnedAt: string
}

interface MerchantRule {
  pattern: RegExp
  categoryName: string
  confidence: Confidence
}

const MERCHANT_RULES: readonly MerchantRule[] = [
  // HIGH — transporte
  { pattern: /\bypf\b/,                 categoryName: 'Transporte',      confidence: 'high' },
  { pattern: /\bshell\b/,              categoryName: 'Transporte',      confidence: 'high' },
  { pattern: /\baxion\b/,              categoryName: 'Transporte',      confidence: 'high' },
  { pattern: /\bpetronas\b/,           categoryName: 'Transporte',      confidence: 'high' },
  { pattern: /\buber\b/,               categoryName: 'Transporte',      confidence: 'high' },
  { pattern: /\bcabify\b/,             categoryName: 'Transporte',      confidence: 'high' },
  { pattern: /\bdidi\b/,               categoryName: 'Transporte',      confidence: 'high' },
  { pattern: /\bsube\b/,               categoryName: 'Transporte',      confidence: 'high' },
  // HIGH — alimentación
  { pattern: /mcdonald|mc donald/,     categoryName: 'Alimentación',    confidence: 'high' },
  { pattern: /\bmostaza\b/,            categoryName: 'Alimentación',    confidence: 'high' },
  { pattern: /burger king/,            categoryName: 'Alimentación',    confidence: 'high' },
  { pattern: /\bstarbucks\b/,          categoryName: 'Alimentación',    confidence: 'high' },
  { pattern: /\brappi\b/,              categoryName: 'Alimentación',    confidence: 'high' },
  { pattern: /pedidosya|pedidos ya/,   categoryName: 'Alimentación',    confidence: 'high' },
  { pattern: /\bcarrefour\b/,          categoryName: 'Alimentación',    confidence: 'high' },
  { pattern: /\bcoto\b/,              categoryName: 'Alimentación',    confidence: 'high' },
  { pattern: /\bjumbo\b/,              categoryName: 'Alimentación',    confidence: 'high' },
  { pattern: /\bdisco\b/,              categoryName: 'Alimentación',    confidence: 'high' },
  { pattern: /\bwalmarts?\b/,          categoryName: 'Alimentación',    confidence: 'high' },
  { pattern: /\bvea\b/,               categoryName: 'Alimentación',    confidence: 'high' },
  { pattern: /\bdia\b/,               categoryName: 'Alimentación',    confidence: 'high' },
  { pattern: /\bwhopper\b/,           categoryName: 'Alimentación',    confidence: 'high' },
  // HIGH — entretenimiento
  { pattern: /\bspotify\b/,            categoryName: 'Entretenimiento', confidence: 'high' },
  { pattern: /\bnetflix\b/,            categoryName: 'Entretenimiento', confidence: 'high' },
  { pattern: /\bdisney\b/,             categoryName: 'Entretenimiento', confidence: 'high' },
  { pattern: /\bsteam\b/,              categoryName: 'Entretenimiento', confidence: 'high' },
  { pattern: /\bxbox\b/,              categoryName: 'Entretenimiento', confidence: 'high' },
  { pattern: /\bplaystation\b/,        categoryName: 'Entretenimiento', confidence: 'high' },
  { pattern: /\bamazon prime/,         categoryName: 'Entretenimiento', confidence: 'high' },
  { pattern: /\bhbo\b/,               categoryName: 'Entretenimiento', confidence: 'high' },
  { pattern: /\bapple tv\b/,           categoryName: 'Entretenimiento', confidence: 'high' },
  { pattern: /\bparamount\b/,          categoryName: 'Entretenimiento', confidence: 'high' },
  // HIGH — salud
  { pattern: /\bfarmacity\b/,          categoryName: 'Salud',           confidence: 'high' },
  { pattern: /farmacia del pueblo/,    categoryName: 'Salud',           confidence: 'high' },
  { pattern: /\bosde\b/,              categoryName: 'Salud',           confidence: 'high' },
  { pattern: /\bswiss medical\b/,      categoryName: 'Salud',           confidence: 'high' },
  { pattern: /\bmedicus\b/,            categoryName: 'Salud',           confidence: 'high' },
  // HIGH — servicios
  { pattern: /\bpersonal\b/,           categoryName: 'Servicios',       confidence: 'high' },
  { pattern: /\bclaro\b/,             categoryName: 'Servicios',       confidence: 'high' },
  { pattern: /\bmovistar\b/,           categoryName: 'Servicios',       confidence: 'high' },
  { pattern: /\bfibertel\b/,           categoryName: 'Servicios',       confidence: 'high' },
  { pattern: /\btelecentro\b/,         categoryName: 'Servicios',       confidence: 'high' },
  { pattern: /\bedesur\b/,            categoryName: 'Servicios',       confidence: 'high' },
  { pattern: /\bedenor\b/,            categoryName: 'Servicios',       confidence: 'high' },
  { pattern: /\bmetrogas\b/,           categoryName: 'Servicios',       confidence: 'high' },
  { pattern: /\baysa\b/,              categoryName: 'Servicios',       confidence: 'high' },
  // MEDIUM — genéricos
  { pattern: /supermercado/,           categoryName: 'Alimentación',    confidence: 'medium' },
  { pattern: /\bmarket\b/,            categoryName: 'Alimentación',    confidence: 'medium' },
  { pattern: /minimarket/,             categoryName: 'Alimentación',    confidence: 'medium' },
  { pattern: /\bfarmacia\b/,           categoryName: 'Salud',           confidence: 'medium' },
  { pattern: /\bdrogueria\b/,          categoryName: 'Salud',           confidence: 'medium' },
  { pattern: /\btaxi\b/,              categoryName: 'Transporte',      confidence: 'medium' },
  { pattern: /\bremis\b/,             categoryName: 'Transporte',      confidence: 'medium' },
  { pattern: /combustible|nafta/,      categoryName: 'Transporte',      confidence: 'medium' },
  { pattern: /\bsueldo\b/,            categoryName: 'Sueldo',          confidence: 'medium' },
  { pattern: /\bhaber\b/,             categoryName: 'Sueldo',          confidence: 'medium' },
  { pattern: /\bcolegio\b/,           categoryName: 'Educación',       confidence: 'medium' },
  { pattern: /\buniversidad\b/,        categoryName: 'Educación',       confidence: 'medium' },
  { pattern: /\bcurso\b/,             categoryName: 'Educación',       confidence: 'medium' },
  { pattern: /\bgym\b|gimnasio/,       categoryName: 'Salud',           confidence: 'medium' },
  { pattern: /\bropa\b|\bvestimenta\b/, categoryName: 'Ropa',           confidence: 'medium' },
  // LOW — señales genéricas
  { pattern: /transferencia/,          categoryName: 'Otros ingresos',  confidence: 'low' },
  { pattern: /\bcobro\b/,             categoryName: 'Otros ingresos',  confidence: 'low' },
  { pattern: /\bpago\b/,              categoryName: 'Otros gastos',    confidence: 'low' },
]

const MERCHANT_RULES_KEY = (userId: string) => `equal_merchant_rules_${userId}`

export function getLearnedRules(userId: string): LearnedRule[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(MERCHANT_RULES_KEY(userId))
    return raw ? (JSON.parse(raw) as LearnedRule[]) : []
  } catch {
    return []
  }
}

function saveLearnedRules(userId: string, rules: LearnedRule[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(MERCHANT_RULES_KEY(userId), JSON.stringify(rules))
}

export function learnMerchantRules(
  userId: string,
  pairs: Array<{ description: string; categoryId: string }>
): void {
  const existing = getLearnedRules(userId)
  const existingKeys = new Set(existing.map(r => r.descriptionKey))
  const now = new Date().toISOString()

  const newRules: LearnedRule[] = pairs
    .map(p => ({ descriptionKey: p.description.toLowerCase().trim(), categoryId: p.categoryId, learnedAt: now }))
    .filter(r => r.descriptionKey.length > 2 && !existingKeys.has(r.descriptionKey))

  const combined = [...newRules, ...existing].slice(0, 1000)
  saveLearnedRules(userId, combined)
}

export function suggestCategory(
  description: string,
  categories: Category[],
  learnedRules?: LearnedRule[]
): CategorySuggestion {
  const lower = description.toLowerCase().trim()

  if (learnedRules) {
    const learned = learnedRules.find(
      r => lower.includes(r.descriptionKey) || r.descriptionKey.includes(lower)
    )
    if (learned) {
      const cat = categories.find(c => c.id === learned.categoryId)
      if (cat?.id) {
        return { categoryId: cat.id, confidence: 'high', matchedRule: `learned:${learned.descriptionKey}` }
      }
    }
  }

  for (const rule of MERCHANT_RULES) {
    if (rule.pattern.test(lower)) {
      const cat = categories.find(c => c.name.toLowerCase() === rule.categoryName.toLowerCase())
      if (cat?.id) {
        return { categoryId: cat.id, confidence: rule.confidence, matchedRule: rule.categoryName }
      }
    }
  }

  return { categoryId: null, confidence: 'none', matchedRule: null }
}
