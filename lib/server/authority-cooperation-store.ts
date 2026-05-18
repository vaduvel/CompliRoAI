// Authority Cooperation Store — Sprint 026 (BUILD NEW per EU AI Act Art. 21 + Art. 26(11)).
//
// Acest store păstrează registrul solicitărilor oficiale primite de la
// autorități (ANSPDCP, ADR, ANCOM, ASF, AI Office, market surveillance
// authority, etc.) și răspunsurile organizației. Este probă auditabilă pentru
// obligația de cooperare:
//
//   - Art. 21 — provider trebuie să furnizeze, la cererea unei autorități
//     naționale competente, toate informațiile și documentația necesară pentru
//     a demonstra conformitatea HRAIS cu cerințele Capitolului 2 (Art. 8-15).
//   - Art. 26(11) — deployer-ul cooperează cu autoritățile competente.
//
// Pentru fiecare solicitare se păstrează: autoritatea, data primirii, deadline,
// subiectul, link-uri către sisteme / incidente / documente, responsabilul,
// status, data răspunsului, data închiderii.

import { randomUUID } from "node:crypto"

import type {
  AuthorityCooperationAuthority,
  AuthorityCooperationRequest,
  AuthorityCooperationStatus,
} from "@/lib/compliance/types"
import { readState, writeState } from "@/lib/server/store"

export const AUTHORITY_LABELS: Record<AuthorityCooperationAuthority, string> = {
  anspdcp: "ANSPDCP — Autoritatea Națională pentru Supravegherea Prelucrării Datelor cu Caracter Personal",
  adr: "ADR — Autoritatea pentru Digitalizarea României",
  ancom: "ANCOM — Autoritatea Națională pentru Administrare și Reglementare în Comunicații",
  asf: "ASF — Autoritatea de Supraveghere Financiară",
  "ai-office": "AI Office — Comisia Europeană (DG CONNECT)",
  "market-surveillance-authority": "Autoritate de supraveghere a pieței (Art. 70)",
  "fundamental-rights-authority": "Autoritate pentru drepturi fundamentale (Art. 77)",
  other: "Altă autoritate (descriere în câmp dedicat)",
}

export const STATUS_LABELS: Record<AuthorityCooperationStatus, string> = {
  received: "Primit — în triaj",
  "in-progress": "În lucru — colectare documente",
  responded: "Răspuns transmis",
  closed: "Închis",
}

export type CreateAuthorityCooperationRequestInput = {
  authority: AuthorityCooperationAuthority
  authorityNameOther?: string
  referenceNumber?: string
  receivedAtISO?: string
  deadlineISO?: string
  subject: string
  linkedSystemIds?: string[]
  linkedIncidentIds?: string[]
  linkedGeneratedDocumentIds?: string[]
  linkedDpiaIds?: string[]
  linkedFriaIds?: string[]
  responsibleEmail: string
  createdByEmail: string
}

export type UpdateAuthorityCooperationRequestPatch = Partial<
  Pick<
    AuthorityCooperationRequest,
    | "authority"
    | "authorityNameOther"
    | "referenceNumber"
    | "deadlineISO"
    | "subject"
    | "responseSummary"
    | "linkedSystemIds"
    | "linkedIncidentIds"
    | "linkedGeneratedDocumentIds"
    | "linkedDpiaIds"
    | "linkedFriaIds"
    | "status"
    | "respondedAtISO"
    | "closedAtISO"
    | "responsibleEmail"
  >
>

export function isAuthorityCooperationAuthority(
  value: unknown,
): value is AuthorityCooperationAuthority {
  return (
    typeof value === "string" &&
    [
      "anspdcp",
      "adr",
      "ancom",
      "asf",
      "ai-office",
      "market-surveillance-authority",
      "fundamental-rights-authority",
      "other",
    ].includes(value)
  )
}

export function isAuthorityCooperationStatus(
  value: unknown,
): value is AuthorityCooperationStatus {
  return (
    typeof value === "string" &&
    ["received", "in-progress", "responded", "closed"].includes(value)
  )
}

export async function listAuthorityCooperationRequests(): Promise<
  AuthorityCooperationRequest[]
> {
  const state = await readState()
  return (state.authorityCooperationRequests ?? []).slice()
}

export async function getAuthorityCooperationRequest(
  id: string,
): Promise<AuthorityCooperationRequest | null> {
  const list = await listAuthorityCooperationRequests()
  return list.find((r) => r.id === id) ?? null
}

export async function createAuthorityCooperationRequest(
  input: CreateAuthorityCooperationRequestInput,
): Promise<AuthorityCooperationRequest> {
  if (!isAuthorityCooperationAuthority(input.authority)) {
    throw new Error("authority invalid")
  }
  if (!input.subject || !input.subject.trim()) {
    throw new Error("subject este obligatoriu")
  }
  if (!input.responsibleEmail || !input.responsibleEmail.trim()) {
    throw new Error("responsibleEmail este obligatoriu")
  }
  if (!input.createdByEmail || !input.createdByEmail.trim()) {
    throw new Error("createdByEmail este obligatoriu")
  }
  if (input.authority === "other" && !input.authorityNameOther?.trim()) {
    throw new Error("authorityNameOther este obligatoriu pentru authority=other")
  }

  const now = new Date().toISOString()
  const record: AuthorityCooperationRequest = {
    id: `auth-coop-${randomUUID()}`,
    authority: input.authority,
    authorityNameOther: input.authorityNameOther?.trim() || undefined,
    referenceNumber: input.referenceNumber?.trim() || undefined,
    receivedAtISO: input.receivedAtISO ?? now,
    deadlineISO: input.deadlineISO,
    subject: input.subject.trim(),
    responseSummary: undefined,
    linkedSystemIds: dedup(input.linkedSystemIds),
    linkedIncidentIds: dedup(input.linkedIncidentIds),
    linkedGeneratedDocumentIds: dedup(input.linkedGeneratedDocumentIds),
    linkedDpiaIds: dedup(input.linkedDpiaIds),
    linkedFriaIds: dedup(input.linkedFriaIds),
    status: "received",
    respondedAtISO: undefined,
    closedAtISO: undefined,
    responsibleEmail: input.responsibleEmail.trim(),
    createdByEmail: input.createdByEmail.trim(),
    createdAtISO: now,
    updatedAtISO: now,
  }

  const state = await readState()
  const existing = state.authorityCooperationRequests ?? []
  await writeState({
    ...state,
    authorityCooperationRequests: [record, ...existing].slice(0, 200),
  })

  return record
}

export async function updateAuthorityCooperationRequest(
  id: string,
  patch: UpdateAuthorityCooperationRequestPatch,
): Promise<AuthorityCooperationRequest | null> {
  const state = await readState()
  const existing = state.authorityCooperationRequests ?? []
  const idx = existing.findIndex((r) => r.id === id)
  if (idx < 0) return null

  const current = existing[idx]
  const now = new Date().toISOString()

  if (patch.authority !== undefined && !isAuthorityCooperationAuthority(patch.authority)) {
    throw new Error("authority invalid")
  }
  if (patch.status !== undefined && !isAuthorityCooperationStatus(patch.status)) {
    throw new Error("status invalid")
  }

  const next: AuthorityCooperationRequest = {
    ...current,
    ...patch,
    linkedSystemIds:
      patch.linkedSystemIds !== undefined ? dedup(patch.linkedSystemIds) : current.linkedSystemIds,
    linkedIncidentIds:
      patch.linkedIncidentIds !== undefined ? dedup(patch.linkedIncidentIds) : current.linkedIncidentIds,
    linkedGeneratedDocumentIds:
      patch.linkedGeneratedDocumentIds !== undefined
        ? dedup(patch.linkedGeneratedDocumentIds)
        : current.linkedGeneratedDocumentIds,
    linkedDpiaIds:
      patch.linkedDpiaIds !== undefined ? dedup(patch.linkedDpiaIds) : current.linkedDpiaIds,
    linkedFriaIds:
      patch.linkedFriaIds !== undefined ? dedup(patch.linkedFriaIds) : current.linkedFriaIds,
    updatedAtISO: now,
  }

  // Auto-stamp lifecycle dates when status transitions.
  if (patch.status === "responded" && !next.respondedAtISO) {
    next.respondedAtISO = now
  }
  if (patch.status === "closed" && !next.closedAtISO) {
    next.closedAtISO = now
  }

  const updated = existing.slice()
  updated[idx] = next
  await writeState({
    ...state,
    authorityCooperationRequests: updated,
  })

  return next
}

export async function deleteAuthorityCooperationRequest(id: string): Promise<boolean> {
  const state = await readState()
  const existing = state.authorityCooperationRequests ?? []
  const next = existing.filter((r) => r.id !== id)
  if (next.length === existing.length) return false
  await writeState({
    ...state,
    authorityCooperationRequests: next,
  })
  return true
}

function dedup(arr: string[] | undefined): string[] | undefined {
  if (!arr) return undefined
  const cleaned = arr.map((s) => s.trim()).filter(Boolean)
  if (cleaned.length === 0) return undefined
  return Array.from(new Set(cleaned))
}

// ─────────────────────────────────────────────────────────────────────────────
//   Audit Pack markdown rendering
// ─────────────────────────────────────────────────────────────────────────────

export function buildAuthorityCooperationMarkdown(
  records: AuthorityCooperationRequest[],
): string {
  const lines: string[] = []
  lines.push(`# Registrul solicitărilor de cooperare cu autoritățile`)
  lines.push(``)
  lines.push(
    `**Baza legală:** Regulamentul (UE) 2024/1689, Articolul 21 (provider) + Articolul 26(11) (deployer).`,
  )
  lines.push(``)
  lines.push(`**Total înregistrări:** ${records.length}.`)
  lines.push(``)

  if (records.length === 0) {
    lines.push(
      `> Niciun request oficial înregistrat. Acest fișier rămâne în Audit Pack ca probă că registrul există și este menținut.`,
    )
    return lines.join("\n")
  }

  lines.push(`| Autoritate | Subiect | Primit | Deadline | Status | Responsabil |`)
  lines.push(`|---|---|---|---|---|---|`)
  for (const r of records) {
    const authLabel =
      r.authority === "other"
        ? r.authorityNameOther ?? "—"
        : AUTHORITY_LABELS[r.authority]
    lines.push(
      `| ${authLabel} | ${escapeMd(r.subject)} | ${shortDate(r.receivedAtISO)} | ${r.deadlineISO ? shortDate(r.deadlineISO) : "—"} | ${STATUS_LABELS[r.status]} | ${escapeMd(r.responsibleEmail)} |`,
    )
  }
  lines.push(``)

  for (const r of records) {
    lines.push(`---`, ``)
    const authLabel =
      r.authority === "other"
        ? r.authorityNameOther ?? "—"
        : AUTHORITY_LABELS[r.authority]
    lines.push(`## ${authLabel}`)
    lines.push(``)
    lines.push(`**ID intern:** \`${r.id}\``)
    if (r.referenceNumber) lines.push(`**Referință autoritate:** ${r.referenceNumber}`)
    lines.push(`**Subiect:** ${r.subject}`)
    lines.push(`**Primit:** ${r.receivedAtISO}`)
    if (r.deadlineISO) lines.push(`**Deadline:** ${r.deadlineISO}`)
    lines.push(`**Status:** ${STATUS_LABELS[r.status]}`)
    lines.push(`**Responsabil:** ${r.responsibleEmail}`)
    if (r.respondedAtISO) lines.push(`**Răspuns transmis:** ${r.respondedAtISO}`)
    if (r.closedAtISO) lines.push(`**Caz închis:** ${r.closedAtISO}`)
    if (r.responseSummary) {
      lines.push(``)
      lines.push(`### Sumar răspuns`)
      lines.push(``)
      lines.push(r.responseSummary)
    }
    const links: string[] = []
    if (r.linkedSystemIds?.length)
      links.push(`- **Sisteme AI:** ${r.linkedSystemIds.join(", ")}`)
    if (r.linkedIncidentIds?.length)
      links.push(`- **Incidente AI (Art. 73):** ${r.linkedIncidentIds.join(", ")}`)
    if (r.linkedGeneratedDocumentIds?.length)
      links.push(
        `- **Documente furnizate (Annex IV / EU DoC / CE):** ${r.linkedGeneratedDocumentIds.join(", ")}`,
      )
    if (r.linkedDpiaIds?.length) links.push(`- **DPIA:** ${r.linkedDpiaIds.join(", ")}`)
    if (r.linkedFriaIds?.length) links.push(`- **FRIA:** ${r.linkedFriaIds.join(", ")}`)
    if (links.length > 0) {
      lines.push(``)
      lines.push(`### Link-uri evidence`)
      lines.push(``)
      lines.push(...links)
    }
    lines.push(``)
  }

  return lines.join("\n")
}

function shortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toISOString().split("T")[0]
}

function escapeMd(s: string): string {
  return s.replace(/\|/g, "\\|")
}
