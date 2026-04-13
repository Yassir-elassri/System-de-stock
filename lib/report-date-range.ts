/** Report period keys for `/api/reports?type=…` */
export type ReportPeriodType = "daily" | "monthly" | "yearly"

export function normalizeReportTypeParam(raw: string | null): ReportPeriodType | null {
  const t = (raw ?? "").toLowerCase().trim()
  if (t === "daily" || t === "today") return "daily"
  if (t === "monthly" || t === "month") return "monthly"
  if (t === "yearly" || t === "year") return "yearly"
  return null
}

/**
 * UTC-inclusive bounds aligned with Prisma-style filters:
 * - daily: calendar day in UTC [00:00:00.000, 23:59:59.999]
 * - monthly: first instant of UTC month → now
 * - yearly: Jan 1 UTC 00:00:00.000 → now
 */
export function getReportUtcBounds(type: ReportPeriodType): { startDate: Date; endDate: Date } {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const d = now.getUTCDate()

  if (type === "daily") {
    return {
      startDate: new Date(Date.UTC(y, m, d, 0, 0, 0, 0)),
      endDate: new Date(Date.UTC(y, m, d, 23, 59, 59, 999)),
    }
  }
  if (type === "monthly") {
    return {
      startDate: new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)),
      endDate: now,
    }
  }
  return {
    startDate: new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0)),
    endDate: now,
  }
}

/** SQLite-friendly UTC datetime string (lexicographic compare works for ISO-like strings). */
export function formatUtcForSqlite(dt: Date): string {
  return dt.toISOString().slice(0, 19).replace("T", " ")
}
