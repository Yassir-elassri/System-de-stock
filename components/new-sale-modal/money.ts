export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Parse user-entered quantity: at least 1 */
export function parseQuantity(s: string): number {
  const trimmed = s.trim()
  if (trimmed === "") return 1
  const n = parseInt(trimmed, 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return n
}

/** Parse money from input (comma or dot) */
export function parseMoneyInput(s: string): number {
  const t = s.trim().replace(",", ".")
  if (t === "" || t === ".") return 0
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : 0
}

export function lineTotal(qtyStr: string, unitPriceStr: string, laborStr: string): number {
  const q = parseQuantity(qtyStr)
  const u = parseMoneyInput(unitPriceStr)
  const l = parseMoneyInput(laborStr)
  return round2(q * u + l)
}

export function sumLineTotals(lines: { qtyStr: string; unitPriceStr: string; laborStr: string }[]): number {
  return round2(lines.reduce((acc, line) => acc + lineTotal(line.qtyStr, line.unitPriceStr, line.laborStr), 0))
}
