import type { Transaction } from '@/types'

export interface CsvRow {
  [key: string]: string
}

export interface ColumnMapping {
  dateColumn: string
  descriptionColumn: string
  amountColumn: string
  typeColumn?: string
  incomeKeyword?: string  // valor en typeColumn que significa ingreso
  expenseKeyword?: string
  dateFormat: DateFormat
  amountSignRule: AmountSignRule
  defaultCurrency: string
  defaultWalletId?: string
  defaultCategoryId?: string
}

export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'DD-MM-YYYY'
// positive_income: monto positivo = ingreso, negativo = gasto
// negative_income: monto negativo = ingreso, positivo = gasto
export type AmountSignRule = 'positive_income' | 'negative_income'

export interface ParsedRow {
  date: string        // YYYY-MM-DD
  description: string
  amount: number
  type: 'income' | 'expense'
  currency: string
  wallet_id?: string | null
  category_id?: string | null
  _index: number      // fila original
  _error?: string
}

export interface BankPreset {
  id: string
  name: string
  logo: string
  separator: string
  mapping: Partial<ColumnMapping>
  sampleColumns: string[]
}

// ── Formatos conocidos de bancos argentinos ───────────────────────────────────

export const BANK_PRESETS: BankPreset[] = [
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    logo: '🔵',
    separator: ',',
    sampleColumns: ['FECHA', 'DESCRIPCION', 'MONTO', 'TIPO'],
    mapping: {
      dateFormat: 'DD/MM/YYYY',
      amountSignRule: 'positive_income',
    },
  },
  {
    id: 'brubank',
    name: 'Brubank',
    logo: '🟣',
    separator: ',',
    sampleColumns: ['Fecha', 'Descripcion', 'Monto', 'Tipo'],
    mapping: {
      dateFormat: 'DD/MM/YYYY',
      amountSignRule: 'positive_income',
    },
  },
  {
    id: 'uala',
    name: 'Ualá',
    logo: '🟡',
    separator: ';',
    sampleColumns: ['fecha', 'descripcion', 'importe'],
    mapping: {
      dateFormat: 'DD/MM/YYYY',
      amountSignRule: 'positive_income',
    },
  },
  {
    id: 'santander',
    name: 'Santander',
    logo: '🔴',
    separator: ';',
    sampleColumns: ['Fecha', 'Descripcion', 'Importe', 'Saldo'],
    mapping: {
      dateFormat: 'DD/MM/YYYY',
      amountSignRule: 'positive_income',
    },
  },
  {
    id: 'galicia',
    name: 'Galicia',
    logo: '🔵',
    separator: ';',
    sampleColumns: ['Fecha', 'Concepto', 'Importe', 'Saldo'],
    mapping: {
      dateFormat: 'DD/MM/YYYY',
      amountSignRule: 'positive_income',
    },
  },
  {
    id: 'bbva',
    name: 'BBVA',
    logo: '🔷',
    separator: ';',
    sampleColumns: ['Fecha', 'Descripcion', 'Monto', 'Saldo'],
    mapping: {
      dateFormat: 'DD/MM/YYYY',
      amountSignRule: 'positive_income',
    },
  },
  {
    id: 'generico',
    name: 'Genérico / Otro',
    logo: '📄',
    separator: ',',
    sampleColumns: [],
    mapping: {
      dateFormat: 'DD/MM/YYYY',
      amountSignRule: 'positive_income',
    },
  },
]

// ── Parseo de CSV ─────────────────────────────────────────────────────────────

export function detectSeparator(content: string): string {
  const firstLine = content.split('\n')[0] ?? ''
  const counts: Record<string, number> = {
    ',': (firstLine.match(/,/g) ?? []).length,
    ';': (firstLine.match(/;/g) ?? []).length,
    '\t': (firstLine.match(/\t/g) ?? []).length,
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ','
}

function parseCsvLine(line: string, sep: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuote = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === sep && !inQuote) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

export function parseCSV(content: string, separator?: string): { headers: string[]; rows: CsvRow[] } {
  const sep = separator ?? detectSeparator(content)
  const lines = content.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  const headers = parseCsvLine(lines[0], sep).map(h =>
    h.replace(/^["'\s]+|["'\s]+$/g, '')
  )

  const rows = lines.slice(1)
    .map(line => {
      const values = parseCsvLine(line, sep)
      const row: CsvRow = {}
      headers.forEach((h, i) => {
        row[h] = (values[i] ?? '').replace(/^["'\s]+|["'\s]+$/g, '')
      })
      return row
    })
    .filter(row => Object.values(row).some(v => v.trim() !== ''))

  return { headers, rows }
}

// ── Conversión de tipos ───────────────────────────────────────────────────────

export function parseArgentineAmount(str: string): number {
  if (!str) return 0
  // Limpiar símbolos de moneda, espacios y signos ANTES de detectar formato
  let cleaned = str.replace(/[$€£\s]/g, '').trim()
  const negative = cleaned.startsWith('-') || (cleaned.startsWith('(') && cleaned.endsWith(')'))
  cleaned = cleaned.replace(/^[-(]|[)]$/g, '').replace(/^[+]/, '')

  // Detectar formato numérico
  // Formato argentino/europeo: 1.234,56 — coma decimal, punto de miles
  // Formato USA: 1,234.56 — punto decimal, coma de miles
  const commaDecimal = /^\d{1,3}(\.\d{3})*,\d+$/.test(cleaned) || /^\d+,\d{1,2}$/.test(cleaned)
  const dotDecimal   = /^\d{1,3}(,\d{3})*\.\d+$/.test(cleaned)  || /^\d+\.\d{1,2}$/.test(cleaned)

  if (commaDecimal) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (dotDecimal) {
    cleaned = cleaned.replace(/,/g, '')
  } else {
    // Sin decimales: eliminar separadores de miles
    cleaned = cleaned.replace(/[.,]/g, '')
  }

  const amount = parseFloat(cleaned) || 0
  return negative ? -Math.abs(amount) : Math.abs(amount)
}

export function parseDateStr(str: string, format: DateFormat): string | null {
  if (!str) return null
  // Quitar hora si viene incluida ("01/03/2024 10:30" → "01/03/2024")
  const dateOnly = str.split(/[\sT]/)[0]?.trim() ?? ''

  let day: number, month: number, year: number

  const parts = dateOnly.split(/[\/\-]/)
  if (parts.length < 3) return null

  switch (format) {
    case 'DD/MM/YYYY':
    case 'DD-MM-YYYY':
      day = parseInt(parts[0]); month = parseInt(parts[1]); year = parseInt(parts[2]); break
    case 'MM/DD/YYYY':
      month = parseInt(parts[0]); day = parseInt(parts[1]); year = parseInt(parts[2]); break
    case 'YYYY-MM-DD':
      year = parseInt(parts[0]); month = parseInt(parts[1]); day = parseInt(parts[2]); break
    default:
      return null
  }

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null
  if (year < 100) year += 2000

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// ── Transformar filas CSV en transacciones parseadas ──────────────────────────

export function mapRowsToTransactions(rows: CsvRow[], mapping: ColumnMapping): ParsedRow[] {
  return rows.map((row, i) => {
    const rawDate   = row[mapping.dateColumn] ?? ''
    const rawDesc   = row[mapping.descriptionColumn] ?? ''
    const rawAmount = row[mapping.amountColumn] ?? ''

    const dateStr = parseDateStr(rawDate, mapping.dateFormat)
    const amount  = parseArgentineAmount(rawAmount)

    if (!dateStr) {
      return {
        date: '', description: rawDesc, amount: Math.abs(amount),
        type: 'expense' as const, currency: mapping.defaultCurrency,
        wallet_id: mapping.defaultWalletId ?? null,
        category_id: mapping.defaultCategoryId ?? null,
        _index: i,
        _error: `Fecha inválida: "${rawDate}"`,
      }
    }

    if (!rawDesc.trim()) {
      return {
        date: dateStr, description: '(sin descripción)', amount: Math.abs(amount),
        type: 'expense' as const, currency: mapping.defaultCurrency,
        wallet_id: mapping.defaultWalletId ?? null,
        category_id: mapping.defaultCategoryId ?? null,
        _index: i,
        _error: 'Descripción vacía',
      }
    }

    // Determinar tipo income/expense
    let type: 'income' | 'expense' = 'expense'

    if (mapping.typeColumn && row[mapping.typeColumn]) {
      const rawType = row[mapping.typeColumn].toLowerCase()
      const inc     = (mapping.incomeKeyword ?? '').toLowerCase()
      const exp     = (mapping.expenseKeyword ?? '').toLowerCase()
      if (inc && rawType.includes(inc)) type = 'income'
      else if (exp && rawType.includes(exp)) type = 'expense'
      else type = amount >= 0 ? 'income' : 'expense'
    } else {
      if (mapping.amountSignRule === 'positive_income') {
        type = amount >= 0 ? 'income' : 'expense'
      } else {
        type = amount <= 0 ? 'income' : 'expense'
      }
    }

    return {
      date: dateStr,
      description: rawDesc.trim(),
      amount: Math.abs(amount),
      type,
      currency: mapping.defaultCurrency,
      wallet_id: mapping.defaultWalletId ?? null,
      category_id: mapping.defaultCategoryId ?? null,
      _index: i,
    }
  })
}

// ── Convertir ParsedRow[] a Transaction[] para el servicio ────────────────────

export function toTransactionInput(
  row: ParsedRow
): Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
  return {
    description: row.description,
    amount: row.amount,
    type: row.type,
    currency: row.currency,
    date: row.date,
    category_id: row.category_id ?? null,
    wallet_id: row.wallet_id ?? null,
  }
}
