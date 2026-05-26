import { categoriesService } from '@/services/categories.service'
import { walletsService }    from '@/services/wallets.service'
import { transactionsService } from '@/services/transactions.service'
import type { Transaction } from '@/types'

type TxInput = Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>

export async function seedDemoData(): Promise<void> {
  // 1. Categorías
  let categories = await categoriesService.list()
  if (categories.length === 0) {
    await categoriesService.seedDefaults()
    categories = await categoriesService.list()
  }
  const catByName = new Map(categories.map(c => [c.name, c.id!]))

  // 2. Billeteras
  const [wBanco, wMP, wCash] = await Promise.all([
    walletsService.create({ name: 'Cuenta corriente', provider: 'Banco',        currency: 'ARS', balance: 150000 }),
    walletsService.create({ name: 'Digital',          provider: 'Mercado Pago', currency: 'ARS', balance: 85000  }),
    walletsService.create({ name: 'Efectivo',         provider: 'Cash',         currency: 'ARS', balance: 20000  }),
  ])

  const B = wBanco.id!
  const M = wMP.id!
  const C = wCash.id!

  function tx(
    date: string, description: string, amount: number,
    type: 'income' | 'expense', catName: string, walletId: string
  ): TxInput {
    return {
      date, description, amount, type,
      currency: 'ARS',
      category_id: catByName.get(catName) ?? null,
      wallet_id: walletId,
    }
  }

  // 3. Transacciones — 38 en total, Feb–May 2026
  const transactions: TxInput[] = [
    // ── Febrero 2026 ──────────────────────────────
    tx('2026-02-10', 'Sueldo febrero',              850000, 'income',  'Sueldo',          B),
    tx('2026-02-12', 'Almuerzo Burger King',          14500, 'expense', 'Alimentación',    M),
    tx('2026-02-14', 'SUBE recarga',                   5000, 'expense', 'Transporte',      M),
    tx('2026-02-18', 'Supermercado Carrefour',         68000, 'expense', 'Alimentación',    M),
    tx('2026-02-20', 'Netflix mensual',                 8500, 'expense', 'Entretenimiento', M),
    tx('2026-02-22', 'Consultorio médico',             25000, 'expense', 'Salud',           C),
    tx('2026-02-25', 'Trabajo freelance diseño',      120000, 'income',  'Freelance',       B),
    tx('2026-02-28', 'Expensas',                       95000, 'expense', 'Hogar',           B),

    // ── Marzo 2026 ────────────────────────────────
    tx('2026-03-05', 'Sueldo marzo',                 850000, 'income',  'Sueldo',          B),
    tx('2026-03-07', 'Taxi Cabify',                    8200, 'expense', 'Transporte',      M),
    tx('2026-03-10', 'Mercado Libre ropa',             48000, 'expense', 'Ropa',            M),
    tx('2026-03-12', 'Cena La Cabrera',                32000, 'expense', 'Alimentación',    M),
    tx('2026-03-15', 'Factura Edesur',                 22000, 'expense', 'Servicios',       B),
    tx('2026-03-17', 'Curso Platzi anual',             55000, 'expense', 'Educación',       M),
    tx('2026-03-18', 'Supermercado Dia',               45000, 'expense', 'Alimentación',    M),
    tx('2026-03-20', 'Internet Fibertel',              18000, 'expense', 'Servicios',       B),
    tx('2026-03-22', 'Farmacia',                       12000, 'expense', 'Salud',           C),
    tx('2026-03-25', 'Freelance app móvil',           200000, 'income',  'Freelance',       B),
    tx('2026-03-27', 'Cine Cinemark x2',               9600, 'expense', 'Entretenimiento', C),
    tx('2026-03-30', 'Dividendos FCI',                 42000, 'income',  'Inversiones',     B),

    // ── Abril 2026 ────────────────────────────────
    tx('2026-04-05', 'Sueldo abril',                 850000, 'income',  'Sueldo',          B),
    tx('2026-04-07', 'Supermercado Walmart',           72000, 'expense', 'Alimentación',    M),
    tx('2026-04-09', 'Nafta Shell',                    38000, 'expense', 'Transporte',      C),
    tx('2026-04-11', 'Spotify',                         4800, 'expense', 'Entretenimiento', M),
    tx('2026-04-13', 'Gas Natural Fenosa',              15000, 'expense', 'Servicios',       B),
    tx('2026-04-15', 'Dentista',                        35000, 'expense', 'Salud',           C),
    tx('2026-04-18', 'Freelance landing page',         180000, 'income',  'Freelance',       B),
    tx('2026-04-20', 'Expensas',                        95000, 'expense', 'Hogar',           B),
    tx('2026-04-23', 'Zapatillas Adidas',               65000, 'expense', 'Ropa',            M),
    tx('2026-04-25', 'HBO Max',                          7200, 'expense', 'Entretenimiento', M),
    tx('2026-04-28', 'Ingresos alquiler habitación',    85000, 'income',  'Otros ingresos',  B),

    // ── Mayo 2026 ─────────────────────────────────
    tx('2026-05-02', 'Sueldo mayo',                  850000, 'income',  'Sueldo',          B),
    tx('2026-05-03', 'Supermercado Coto',              58000, 'expense', 'Alimentación',    M),
    tx('2026-05-05', 'Taxi',                            6500, 'expense', 'Transporte',      M),
    tx('2026-05-06', 'Agua y snacks kiosco',            4200, 'expense', 'Alimentación',    C),
    tx('2026-05-07', 'Librería útiles',                  8900, 'expense', 'Educación',       C),
    tx('2026-05-08', 'Freelance consultoría',           95000, 'income',  'Freelance',       B),
    tx('2026-05-10', 'Almuerzo con compañeros',         18500, 'expense', 'Alimentación',    M),
  ]

  await transactionsService.createBatch(transactions)
}
