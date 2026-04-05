/**
 * Shared helpers for case-insensitive, partial (substring) search.
 * Normalize the query once per render/input with normalizeSearchQuery().
 */

export function normalizeSearchQuery(raw: string): string {
  return raw.trim().toLowerCase()
}

/** `needleLower` must come from normalizeSearchQuery (lowercased). */
export function fieldMatches(value: unknown, needleLower: string): boolean {
  if (needleLower === "") return true
  if (value === null || value === undefined) return false
  return String(value).toLowerCase().includes(needleLower)
}

/** `needleLower` must come from normalizeSearchQuery. */
export function productMatchesSearch(product: object, needleLower: string): boolean {
  if (needleLower === "") return true
  const p = product as Record<string, unknown>
  return (
    fieldMatches(p.name, needleLower) ||
    fieldMatches(p.description, needleLower) ||
    fieldMatches(p.category, needleLower) ||
    fieldMatches(p.barcode, needleLower) ||
    fieldMatches(p.unit, needleLower) ||
    fieldMatches(p.id, needleLower)
  )
}

/** `needleLower` must come from normalizeSearchQuery. Searches achat header + line items (stock products). */
export function purchaseMatchesSearch(purchase: object, needleLower: string): boolean {
  if (needleLower === "") return true
  const p = purchase as Record<string, unknown>
  const items = Array.isArray(p.items) ? p.items : []
  const matchesLineItem = items.some((item) => {
    const row = item as Record<string, unknown>
    return fieldMatches(row.designation, needleLower) || fieldMatches(row.product_id, needleLower)
  })
  return (
    fieldMatches(p.supplier_name, needleLower) ||
    fieldMatches(p.invoice_number, needleLower) ||
    fieldMatches(p.notes, needleLower) ||
    fieldMatches(p.id, needleLower) ||
    fieldMatches(p.payment_method, needleLower) ||
    matchesLineItem
  )
}
