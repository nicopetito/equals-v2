export interface DollarRate {
  currency: string
  buy: number
  sell: number
  timestamp: Date
}

export type DollarRateType = 'oficial' | 'blue' | 'ccl' | 'mep'
