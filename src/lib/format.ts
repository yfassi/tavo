const eurFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
})

const rawFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatPrice(amountCents: number): string {
  return eurFormatter.format(amountCents / 100)
}

export function formatPriceRaw(amountCents: number): string {
  return rawFormatter.format(amountCents / 100)
}
