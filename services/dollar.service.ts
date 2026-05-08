import type { DollarRate } from '@/types'

const API_URL = 'https://api.bluelytics.com.ar/v2/latest'

export const dollarService = {
  async getRates(): Promise<DollarRate[]> {
    const response = await fetch(API_URL, { next: { revalidate: 60 } })
    if (!response.ok) throw new Error('Failed to fetch dollar rates')

    const data = await response.json()
    const rates: DollarRate[] = []
    const timestamp = new Date(data.last_update)

    if (data.oficial) {
      rates.push({ currency: 'Oficial', buy: data.oficial.value_buy, sell: data.oficial.value_sell, timestamp })
    }
    if (data.blue) {
      rates.push({ currency: 'Blue', buy: data.blue.value_buy, sell: data.blue.value_sell, timestamp })
    }
    if (data.oficial_euro) {
      rates.push({ currency: 'Euro Oficial', buy: data.oficial_euro.value_buy, sell: data.oficial_euro.value_sell, timestamp })
    }
    if (data.blue_euro) {
      rates.push({ currency: 'Euro Blue', buy: data.blue_euro.value_buy, sell: data.blue_euro.value_sell, timestamp })
    }

    return rates
  },
}
