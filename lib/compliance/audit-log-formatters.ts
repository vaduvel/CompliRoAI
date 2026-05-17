/**
 * Sprint 011 — Audit Log Formatters
 *
 * Renderează `ComplianceEvent[]` în 3 formate:
 *  - Markdown (tabel + metadata + verify hint)
 *  - CSV (RFC 4180 compliant: quoted strings, escaped quotes, CRLF lines)
 *  - JSON (pretty-printed, optional include hash chain fields)
 *
 * Folosit de:
 *  - `/api/audit-log/export` (server) pentru download
 *  - Audit Pack builder (server) pentru `audit-log/events.md` + `audit-log/events.json`
 *  - UI (`/dashboard/audit-log`) pentru export client-side opțional
 *
 * Toate output-urile sunt deterministe: aceeași listă de evenimente => același
 * string output (sortat newest-first, timestamps în ISO 8601).
 */

import type { ComplianceEvent } from "@/lib/compliance/types"

// ────────────────────────────────────────────────────────────────────────────
//   Markdown
// ────────────────────────────────────────────────────────────────────────────

/**
 * Render `events` ca tabel Markdown cu antet + footer + integrity hint.
 * Sortare: newest-first (descrescător după `createdAtISO`).
 */
export function formatEventsAsMarkdown(
  events: ComplianceEvent[],
  orgName: string,
  exportedAtISO: string,
): string {
  const sorted = [...events].sort((a, b) =>
    b.createdAtISO.localeCompare(a.createdAtISO),
  )

  const header = [
    `# Audit Log — ${escapeMd(orgName)}`,
    ``,
    `**Exportat:** ${exportedAtISO}`,
    `**Total evenimente:** ${sorted.length}`,
    `**Format:** ledger criptografic (SHA-256 hash chain)`,
    ``,
    `Toate evenimentele sunt înlănțuite cryptographic (selfHash + prevHash).`,
    `Orice modificare a unui eveniment rupe lanțul și e detectabilă prin`,
    `\`verifyEventChain()\` (vezi pagina \`/dashboard/audit-log\` → buton "Verifică lanț").`,
    ``,
    `---`,
    ``,
  ].join("\n")

  if (sorted.length === 0) {
    return `${header}_Nu există evenimente în acest filtru._\n`
  }

  const rows = sorted.map((e) => {
    const ts = e.createdAtISO
    const actor = e.actorLabel ?? e.actorId ?? "system"
    const role = e.actorRole ?? "—"
    const type = e.type
    const entity = `${e.entityType}#${shortenId(e.entityId)}`
    const msg = escapeMd(e.message)
    const hash = e.selfHash ? e.selfHash.slice(0, 12) : "—"
    return `| ${ts} | ${escapeMd(actor)} | ${role} | ${type} | ${entity} | ${msg} | \`${hash}\` |`
  })

  const table = [
    `| Timestamp | Actor | Rol | Tip eveniment | Entitate | Mesaj | Hash |`,
    `|---|---|---|---|---|---|---|`,
    ...rows,
  ].join("\n")

  const metadataBlocks = sorted
    .filter((e) => e.metadata && Object.keys(e.metadata).length > 0)
    .map((e) => {
      const lines = Object.entries(e.metadata!).map(
        ([k, v]) => `- **${k}:** \`${String(v).replace(/`/g, "'")}\``,
      )
      return [
        ``,
        `### Eveniment ${e.id} — metadata`,
        `**Tip:** \`${e.type}\` · **Entitate:** \`${e.entityType}#${e.entityId}\``,
        ``,
        ...lines,
      ].join("\n")
    })

  const footer = metadataBlocks.length
    ? [``, `---`, ``, `## Metadata detaliată`, ...metadataBlocks, ``].join("\n")
    : ""

  return `${header}${table}\n${footer}`
}

// ────────────────────────────────────────────────────────────────────────────
//   CSV (RFC 4180)
// ────────────────────────────────────────────────────────────────────────────

const CSV_HEADERS = [
  "id",
  "createdAtISO",
  "type",
  "entityType",
  "entityId",
  "actorId",
  "actorLabel",
  "actorRole",
  "actorSource",
  "message",
  "metadata",
  "prevHash",
  "selfHash",
] as const

/**
 * Render `events` ca CSV (RFC 4180): câmpurile cu virgulă/ghilimele/newline
 * sunt înconjurate de `"` și ghilimelele interne sunt dublate. Linii separate
 * cu `\r\n`. Metadata serializată ca JSON one-line.
 */
export function formatEventsAsCSV(events: ComplianceEvent[]): string {
  const sorted = [...events].sort((a, b) =>
    b.createdAtISO.localeCompare(a.createdAtISO),
  )

  const headerLine = CSV_HEADERS.join(",")
  const rows = sorted.map((e) => {
    const metadataJson = e.metadata ? JSON.stringify(e.metadata) : ""
    return [
      csvEscape(e.id),
      csvEscape(e.createdAtISO),
      csvEscape(e.type),
      csvEscape(e.entityType),
      csvEscape(e.entityId),
      csvEscape(e.actorId ?? ""),
      csvEscape(e.actorLabel ?? ""),
      csvEscape(e.actorRole ?? ""),
      csvEscape(e.actorSource ?? ""),
      csvEscape(e.message),
      csvEscape(metadataJson),
      csvEscape(e.prevHash ?? ""),
      csvEscape(e.selfHash ?? ""),
    ].join(",")
  })

  return [headerLine, ...rows].join("\r\n") + "\r\n"
}

function csvEscape(value: string): string {
  if (value === "") return ""
  // RFC 4180: if value contains comma, quote, CR, or LF -> wrap in quotes and escape quotes.
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// ────────────────────────────────────────────────────────────────────────────
//   JSON
// ────────────────────────────────────────────────────────────────────────────

/**
 * Render `events` ca JSON pretty-printed (2 spaces). Dacă
 * `includeChainHashes=false`, omite `prevHash` și `selfHash` (util pentru
 * export client-facing care nu vrea să dezvăluie integritatea criptografică).
 */
export function formatEventsAsJSON(
  events: ComplianceEvent[],
  includeChainHashes: boolean,
): string {
  const sorted = [...events].sort((a, b) =>
    b.createdAtISO.localeCompare(a.createdAtISO),
  )

  const payload = sorted.map((e) => {
    if (includeChainHashes) return e
    const { prevHash: _p, selfHash: _s, ...rest } = e
    void _p
    void _s
    return rest
  })

  return JSON.stringify(payload, null, 2) + "\n"
}

// ────────────────────────────────────────────────────────────────────────────
//   Helpers
// ────────────────────────────────────────────────────────────────────────────

function escapeMd(value: string): string {
  // Markdown tables nu permit `|` sau newline în celulă. Le înlocuim.
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim()
}

function shortenId(id: string): string {
  if (id.length <= 14) return id
  return `${id.slice(0, 10)}…`
}
