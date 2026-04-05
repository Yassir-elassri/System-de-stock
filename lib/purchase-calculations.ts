/**
 * Purchase / invoice line math (quantity × unit + labor − advance).
 * All outputs rounded to 2 decimal places; inputs coerced safely from strings.
 */

export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Parse user/API values without NaN or string concatenation surprises */
export function parseMoney(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  const s = String(value).trim().replace(",", ".")
  if (s === "") return 0
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

export type PurchaseLineInput = {
  quantity: unknown
  unit_price: unknown
  /** Main d'œuvre — stored as additional_price in DB */
  labor_cost: unknown
  avance: unknown
}

export type PurchaseLineComputed = {
  baseAmount: number
  total: number
  reste: number
}

/**
 * 1. baseAmount = quantity × unit_price
 * 2. total = baseAmount + labor_cost
 * 3. reste = total − avance (never negative)
 */
export function computePurchaseLine(input: PurchaseLineInput): PurchaseLineComputed {
  const qty = parseMoney(input.quantity)
  const unit = parseMoney(input.unit_price)
  const labor = parseMoney(input.labor_cost)
  const avance = parseMoney(input.avance)
  const baseAmount = round2(qty * unit)
  const total = round2(baseAmount + labor)
  const reste = round2(Math.max(0, total - avance))
  return { baseAmount, total, reste }
}

export type PurchaseItemRowState = {
  id: number
  designation: string
  quantity: string
  unit_price: string
  additional_price: string
  amount: string
  avance: string
  reste: string
}

export function recalculatePurchaseItemRow(item: PurchaseItemRowState): PurchaseItemRowState {
  const { total, reste } = computePurchaseLine({
    quantity: item.quantity,
    unit_price: item.unit_price,
    labor_cost: item.additional_price,
    avance: item.avance,
  })
  return {
    ...item,
    amount: total.toFixed(2),
    reste: reste.toFixed(2),
  }
}

/** Document total = sum of line totals (base + labor per line) */
export function sumLineTotals(items: { amount?: string }[]): number {
  return round2(items.reduce((sum, item) => sum + parseMoney(item.amount), 0))
}

export function sumRestes(items: { reste?: string }[]): number {
  return round2(items.reduce((sum, item) => sum + parseMoney(item.reste), 0))
}

/** API / form line shape: quantity, unit_price, additional_price (labor), avance */
export type PurchaseItemLike = {
  quantity?: unknown
  unit_price?: unknown
  additional_price?: unknown
  avance?: unknown
}

/** Same rules as the purchase form: sum bases, labor, line totals, avances, restes from line math */
export function aggregatePurchaseDocumentTotals(items: PurchaseItemLike[]) {
  let baseSum = 0
  let laborSum = 0
  let totalSum = 0
  let avanceSum = 0
  let resteSum = 0
  for (const item of items) {
    const labor = parseMoney(item.additional_price)
    const { baseAmount, total, reste } = computePurchaseLine({
      quantity: item.quantity,
      unit_price: item.unit_price,
      labor_cost: item.additional_price,
      avance: item.avance,
    })
    baseSum += baseAmount
    laborSum += labor
    totalSum += total
    avanceSum += parseMoney(item.avance)
    resteSum += reste
  }
  return {
    baseSum: round2(baseSum),
    laborSum: round2(laborSum),
    totalSum: round2(totalSum),
    avanceSum: round2(avanceSum),
    resteSum: round2(resteSum),
  }
}

/** Server/client guard: header total must match sum of line totals (qty×unit + labor per line). */
export function validatePurchaseTotalMatchesLines(
  total_amount: unknown,
  items: PurchaseItemLike[] | undefined | null,
): { ok: true } | { ok: false; message: string } {
  if (!items || items.length === 0) return { ok: true }
  const { totalSum } = aggregatePurchaseDocumentTotals(items)
  const header = round2(parseMoney(total_amount))
  if (Math.abs(header - totalSum) > 0.02) {
    return {
      ok: false,
      message: `Le montant total (${header.toFixed(2)} DH) ne correspond pas à la somme des lignes (${totalSum.toFixed(2)} DH).`,
    }
  }
  return { ok: true }
}
