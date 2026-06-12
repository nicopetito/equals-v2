import { describe, it, expect } from 'vitest'
import { DEFAULT_CATEGORIES } from '@/services/categories.service'

describe('DEFAULT_CATEGORIES', () => {
  it('tiene exactamente 20 entradas (14 gastos + 6 ingresos)', () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(20)
  })

  it('cada categoría tiene name, type, color, icon e is_default', () => {
    for (const cat of DEFAULT_CATEGORIES) {
      expect(cat.name,       `falta name en ${JSON.stringify(cat)}`).toBeTruthy()
      expect(cat.type,       `falta type en ${cat.name}`).toMatch(/^(income|expense)$/)
      expect(cat.color,      `falta color en ${cat.name}`).toMatch(/^#[0-9a-f]{6}$/i)
      expect(cat.icon,       `falta icon en ${cat.name}`).toBeTruthy()
      expect(cat.is_default, `is_default debe ser true en ${cat.name}`).toBe(true)
    }
  })

  it('tiene 14 categorías de gasto', () => {
    const expenses = DEFAULT_CATEGORIES.filter(c => c.type === 'expense')
    expect(expenses).toHaveLength(14)
  })

  it('tiene 6 categorías de ingreso', () => {
    const incomes = DEFAULT_CATEGORIES.filter(c => c.type === 'income')
    expect(incomes).toHaveLength(6)
  })

  it('no tiene duplicados (name + type únicos)', () => {
    const keys = DEFAULT_CATEGORIES.map(c => `${c.name}|${c.type}`)
    const unique = new Set(keys)
    expect(unique.size).toBe(DEFAULT_CATEGORIES.length)
  })

  it('incluye las categorías de gasto obligatorias', () => {
    const names = DEFAULT_CATEGORIES.filter(c => c.type === 'expense').map(c => c.name)
    const required = ['Alimentación', 'Transporte', 'Alquiler', 'Servicios', 'Salud', 'Supermercado', 'Ropa', 'Otros gastos']
    for (const name of required) {
      expect(names, `falta categoría de gasto: ${name}`).toContain(name)
    }
  })

  it('incluye las categorías de ingreso obligatorias', () => {
    const names = DEFAULT_CATEGORIES.filter(c => c.type === 'income').map(c => c.name)
    const required = ['Sueldo', 'Freelance', 'Ventas', 'Otros ingresos']
    for (const name of required) {
      expect(names, `falta categoría de ingreso: ${name}`).toContain(name)
    }
  })

  it('no incluye categorías de sistema como Rendimientos, Sin categoría, Ajuste, Saldo inicial', () => {
    const systemNames = ['Rendimientos', 'Sin categoría', 'Ajuste', 'Saldo inicial']
    const names = DEFAULT_CATEGORIES.map(c => c.name)
    for (const name of systemNames) {
      expect(names, `${name} no debe estar en DEFAULT_CATEGORIES (es categoría de sistema)`).not.toContain(name)
    }
  })
})

describe('lógica de deduplicación de ensureDefaultCategories', () => {
  it('no inserta categorías si todas ya existen', () => {
    const existingKeys = new Set(DEFAULT_CATEGORIES.map(c => `${c.name}|${c.type}`))
    const toInsert = DEFAULT_CATEGORIES.filter(cat => !existingKeys.has(`${cat.name}|${cat.type}`))
    expect(toInsert).toHaveLength(0)
  })

  it('inserta solo las que faltan cuando hay categorías parciales', () => {
    const existingKeys = new Set(['Sueldo|income', 'Alquiler|expense'])
    const toInsert = DEFAULT_CATEGORIES.filter(cat => !existingKeys.has(`${cat.name}|${cat.type}`))
    expect(toInsert.length).toBe(DEFAULT_CATEGORIES.length - 2)
    expect(toInsert.map(c => `${c.name}|${c.type}`)).not.toContain('Sueldo|income')
    expect(toInsert.map(c => `${c.name}|${c.type}`)).not.toContain('Alquiler|expense')
  })

  it('inserta todas cuando no hay ninguna existente', () => {
    const existingKeys = new Set<string>()
    const toInsert = DEFAULT_CATEGORIES.filter(cat => !existingKeys.has(`${cat.name}|${cat.type}`))
    expect(toInsert).toHaveLength(DEFAULT_CATEGORIES.length)
  })
})
