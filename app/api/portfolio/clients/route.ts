// Portfolio CRUD — list + add clients for cabinet users.
//
// Authorization: only cabinet users (workspaceMode=cabinet) can call these.
//
// Listing returns the cabinet's portfolio: every org where the current user has
// role=partner_manager (i.e. is the consultant).
//
// Adding a client creates a new org and grants the cabinet user partner_manager
// membership on it.

import { NextResponse } from "next/server"

import {
  buildClientImportFindings,
  buildClientImportSignals,
  draftToClientMeta,
  isValidEmail,
  normalizeCui,
  type ClientImportDraft,
} from "@/lib/client-import"
import { appendComplianceEvents, createComplianceEvent } from "@/lib/compliance/events"
import type { ClientMeta } from "@/lib/compliance/types"
import { getOrgContext } from "@/lib/server/org-context"
import { sendMagicLinkEmail } from "@/lib/server/share-magic-link-email"
import { buildShareUrl, createShareToken } from "@/lib/server/share-token-store"
import {
  loadOrgStateFromSupabase,
  loadOrgStatesFromSupabase,
  persistOrgStateToSupabase,
} from "@/lib/server/supabase-org-state"
import {
  createClientOrg,
  listUserMemberships,
} from "@/lib/server/tenancy"
import { mergeWithDefault, type AIActState } from "@/lib/server/store"
import { getEffectiveBranding } from "@/lib/server/white-label"

type ClientRow = {
  orgId: string
  orgName: string
  membershipId: string
  createdAtISO: string
  cui?: string
  contactName?: string
  contactEmail?: string
  sector?: string
  employees?: string
  city?: string
  country?: string
  serviceScope?: string[]
  expectedAiRole?: string
  usesAi?: string
  personalDataAi?: string
  highRiskSuspected?: string
  clientStatus?: string
  tags?: string[]
  importSignalsCount?: number
  aiSystemsCount: number
  literacyTrainingsCount: number
  onboardingCompleted: boolean
}

type BulkImportResult = {
  rowNumber: number
  ok: boolean
  orgId?: string
  orgName: string
  message: string
  intakeUrl?: string
  signals: string[]
}

function getClientMeta(state: Partial<AIActState> | null | undefined): ClientMeta | undefined {
  if (!state || typeof state !== "object") return undefined
  return state.clientMeta
}

function normalizeNameKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function existingClientKeys(clients: Array<{ orgName: string; state: Partial<AIActState> | null }>) {
  const keys = new Set<string>()
  for (const client of clients) {
    const meta = getClientMeta(client.state)
    keys.add(`name:${normalizeNameKey(client.orgName)}`)
    if (meta?.cui) keys.add(`cui:${meta.cui}`)
    if (meta?.externalId) keys.add(`external:${meta.externalId}`)
  }
  return keys
}

async function createIntakeForClient(input: {
  requestUrl: string
  cabinetOrgId: string
  cabinetUserId: string
  cabinetEmail: string
  cabinetName: string
  clientOrgId: string
  clientName: string
  recipientEmail: string
  recipientName?: string
}) {
  const branding = await getEffectiveBranding(input.cabinetOrgId)
  const cabinetDisplayName = branding.isCustom ? branding.brandName : input.cabinetName
  const record = await createShareToken({
    orgId: input.clientOrgId,
    createdByUserId: input.cabinetUserId,
    createdByEmail: input.cabinetEmail,
    targetType: "intake",
    targetLabel: `Onboarding inițial — ${input.clientName}`,
    recipientEmail: input.recipientEmail,
    expiresInDays: 14,
    metadata: {
      ...(input.recipientName ? { recipientName: input.recipientName } : {}),
      cabinetName: cabinetDisplayName,
      source: "client_import",
      branding: {
        isCustom: branding.isCustom,
        brandName: branding.brandName,
        logoUrl: branding.logoUrl,
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        signerName: branding.signerName,
        signerTitle: branding.signerTitle,
        contactEmail: branding.contactEmail,
        website: branding.website,
      },
    },
  })
  if (!record.token) {
    throw new Error("Token-ul de intake nu a putut fi generat.")
  }
  const url = buildShareUrl(input.requestUrl, record.token)
  await sendMagicLinkEmail({
    toEmail: input.recipientEmail,
    recipientName: input.recipientName,
    cabinetName: cabinetDisplayName,
    targetType: "intake",
    targetLabel: `Onboarding inițial — ${input.clientName}`,
    shareUrl: url,
    expiresAtISO: record.expiresAtISO,
    branding,
  })
  return url
}

async function persistImportedClientState(input: {
  orgId: string
  orgName: string
  meta: ClientMeta
  cabinetUserId: string
  cabinetEmail: string
  nowISO: string
}) {
  const existing = await loadOrgStateFromSupabase<Partial<AIActState>>(input.orgId)
  const state = mergeWithDefault(existing)
  state.clientMeta = input.meta
  const initialFindings = buildClientImportFindings({
    orgId: input.orgId,
    meta: input.meta,
    nowISO: input.nowISO,
  })
  const existingFindingIds = new Set((state.findings ?? []).map((finding) => finding.id))
  const newFindings = initialFindings.filter((finding) => !existingFindingIds.has(finding.id))
  if (newFindings.length > 0) {
    state.findings = [...newFindings, ...(state.findings ?? [])]
  }
  const actor = {
    id: input.cabinetUserId,
    label: input.cabinetEmail,
    role: "partner_manager",
    source: "session",
  } as const
  state.events = appendComplianceEvents(state, [
    ...newFindings.map((finding) =>
      createComplianceEvent(
        {
          type: "finding.created",
          entityType: "finding",
          entityId: finding.id,
          message: `Acțiune inițială creată din import: ${finding.title}`,
          createdAtISO: input.nowISO,
          metadata: {
            category: finding.category,
            severity: finding.severity,
            source: "client_import",
          },
        },
        actor
      )
    ),
    createComplianceEvent(
      {
        type: "client.imported",
        entityType: "task",
        entityId: input.orgId,
        message: `Client importat în portofoliu: ${input.orgName}`,
        createdAtISO: input.nowISO,
        metadata: {
          serviceScope: input.meta.serviceScope?.join(",") ?? "",
          usesAi: input.meta.usesAi ?? "unknown",
          personalDataAi: input.meta.personalDataAi ?? "unknown",
          signalsCount: input.meta.importSignals?.length ?? 0,
          initialFindingsCount: newFindings.length,
        },
      },
      actor
    ),
  ])
  await persistOrgStateToSupabase(input.orgId, state)
}

export async function GET() {
  try {
    const ctx = await getOrgContext()
    if (ctx.workspaceMode !== "cabinet") {
      return NextResponse.json(
        { error: "Doar utilizatorii in mod cabinet pot accesa portofoliul." },
        { status: 403 }
      )
    }

    const memberships = await listUserMemberships(ctx.userId)
    const clientMemberships = memberships.filter(
      (m) => m.status === "active" && m.role === "partner_manager"
    )
    const stateByOrgId = await loadOrgStatesFromSupabase<Partial<AIActState>>(clientMemberships.map((m) => m.orgId))

    const clients: ClientRow[] = await Promise.all(
      clientMemberships.map(async (m) => {
        const state = stateByOrgId.get(m.orgId) ?? null
        const meta = getClientMeta(state)
        return {
          orgId: m.orgId,
          orgName: m.orgName,
          membershipId: m.membershipId,
          createdAtISO: m.createdAtISO,
          cui: meta?.cui,
          contactName: meta?.contactName,
          contactEmail: meta?.contactEmail,
          sector: meta?.sector,
          employees: meta?.employees,
          city: meta?.city,
          country: meta?.country,
          serviceScope: meta?.serviceScope,
          expectedAiRole: meta?.expectedAiRole,
          usesAi: meta?.usesAi,
          personalDataAi: meta?.personalDataAi,
          highRiskSuspected: meta?.highRiskSuspected,
          clientStatus: meta?.clientStatus,
          tags: meta?.tags,
          importSignalsCount: meta?.importSignals?.filter((signal) => signal.status === "open").length ?? 0,
          aiSystemsCount: Array.isArray(state?.aiSystems) ? state!.aiSystems!.length : 0,
          literacyTrainingsCount: Array.isArray(state?.literacyRecords)
            ? state!.literacyRecords!.length
            : 0,
          onboardingCompleted: state?.onboarding?.completed === true,
        }
      })
    )

    return NextResponse.json({ clients, total: clients.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare la incarcarea portofoliului."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    if (ctx.workspaceMode !== "cabinet") {
      return NextResponse.json(
        { error: "Doar cabinetele pot adauga clienti." },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const orgName = typeof body?.orgName === "string" ? body.orgName.trim() : ""
    const cuiRaw = typeof body?.cui === "string" ? body.cui.trim() : ""
    const cui = normalizeCui(cuiRaw)
    const nowISO = new Date().toISOString()

    if (orgName.length < 2) {
      return NextResponse.json(
        { error: "Numele firmei trebuie sa aiba minim 2 caractere." },
        { status: 400 }
      )
    }
    if (cuiRaw && !cui) {
      return NextResponse.json(
        { error: "CUI invalid. Format: RO12345678 sau 12345678." },
        { status: 400 }
      )
    }
    const contactEmail = typeof body?.contactEmail === "string" ? body.contactEmail.trim() : ""
    const intakeEmail = typeof body?.intakeEmail === "string" ? body.intakeEmail.trim() : contactEmail
    if (contactEmail && !isValidEmail(contactEmail)) {
      return NextResponse.json({ error: "Email contact invalid." }, { status: 400 })
    }
    if (intakeEmail && !isValidEmail(intakeEmail)) {
      return NextResponse.json({ error: "Email intake invalid." }, { status: 400 })
    }

    const signals = buildClientImportSignals({
      usesAi: body?.usesAi === "yes" || body?.usesAi === "no" ? body.usesAi : "unknown",
      personalDataAi:
        body?.personalDataAi === "yes" || body?.personalDataAi === "no"
          ? body.personalDataAi
          : "unknown",
      highRiskSuspected:
        body?.highRiskSuspected === "yes" || body?.highRiskSuspected === "no"
          ? body.highRiskSuspected
          : "unknown",
      serviceScope: Array.isArray(body?.serviceScope) ? body.serviceScope : ["ai_act"],
      sendIntake: body?.sendIntake === true,
      nowISO,
    })

    const created = await createClientOrg({
      cabinetUserId: ctx.userId,
      orgName,
      cui,
    })

    let intakeUrl: string | undefined
    const meta: ClientMeta = {
      orgName,
      cui,
      contactName: typeof body?.contactName === "string" ? body.contactName.trim() : undefined,
      contactEmail: contactEmail || undefined,
      phone: typeof body?.phone === "string" ? body.phone.trim() : undefined,
      sector: typeof body?.sector === "string" ? body.sector.trim() : undefined,
      employees: typeof body?.employees === "string" ? body.employees.trim() : undefined,
      city: typeof body?.city === "string" ? body.city.trim() : undefined,
      country: typeof body?.country === "string" ? body.country.trim() : undefined,
      serviceScope: Array.isArray(body?.serviceScope) ? body.serviceScope : ["ai_act"],
      expectedAiRole:
        body?.expectedAiRole === "deployer" ||
        body?.expectedAiRole === "provider" ||
        body?.expectedAiRole === "builder"
          ? body.expectedAiRole
          : "unknown",
      usesAi: body?.usesAi === "yes" || body?.usesAi === "no" ? body.usesAi : "unknown",
      personalDataAi:
        body?.personalDataAi === "yes" || body?.personalDataAi === "no"
          ? body.personalDataAi
          : "unknown",
      highRiskSuspected:
        body?.highRiskSuspected === "yes" || body?.highRiskSuspected === "no"
          ? body.highRiskSuspected
          : "unknown",
      assignedTo: typeof body?.assignedTo === "string" ? body.assignedTo.trim() : undefined,
      clientStatus:
        body?.clientStatus === "active" ||
        body?.clientStatus === "paused" ||
        body?.clientStatus === "archived"
          ? body.clientStatus
          : "lead",
      intakeEmail: intakeEmail || undefined,
      sendIntake: body?.sendIntake === true,
      notes: typeof body?.notes === "string" ? body.notes.trim() : undefined,
      tags: Array.isArray(body?.tags) ? body.tags : [],
      externalId: typeof body?.externalId === "string" ? body.externalId.trim() : undefined,
      createdByCabinet: ctx.userId,
      createdAtISO: nowISO,
      importedAtISO: nowISO,
      importSource: "manual",
      importSignals: signals,
    }

    if (meta.sendIntake && meta.intakeEmail) {
      intakeUrl = await createIntakeForClient({
        requestUrl: request.url,
        cabinetOrgId: ctx.orgId,
        cabinetUserId: ctx.userId,
        cabinetEmail: ctx.email,
        cabinetName: ctx.orgName,
        clientOrgId: created.orgId,
        clientName: orgName,
        recipientEmail: meta.intakeEmail,
        recipientName: meta.contactName,
      })
      meta.intakeLinkUrl = intakeUrl
      meta.intakeLinkCreatedAtISO = nowISO
    }

    await persistImportedClientState({
      orgId: created.orgId,
      orgName,
      meta,
      cabinetUserId: ctx.userId,
      cabinetEmail: ctx.email,
      nowISO,
    })

    return NextResponse.json({
      ok: true,
      client: {
        orgId: created.orgId,
        orgName: created.orgName,
        membershipId: created.membershipId,
        cui,
        intakeUrl,
        signals: signals.map((signal) => signal.label),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare la adaugarea clientului."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const ctx = await getOrgContext()
    if (ctx.workspaceMode !== "cabinet") {
      return NextResponse.json(
        { error: "Doar cabinetele pot importa clienti." },
        { status: 403 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as { rows?: ClientImportDraft[] }
    const rows = Array.isArray(body.rows) ? body.rows : []
    if (rows.length === 0) {
      return NextResponse.json({ error: "Niciun rând de importat." }, { status: 400 })
    }
    if (rows.length > 200) {
      return NextResponse.json({ error: "Importul acceptă maximum 200 de clienți per fișier." }, { status: 400 })
    }

    const memberships = await listUserMemberships(ctx.userId)
    const clientMemberships = memberships.filter(
      (m) => m.status === "active" && m.role === "partner_manager"
    )
    const existing = await Promise.all(
      clientMemberships.map(async (m) => ({
        orgName: m.orgName,
        state: await loadOrgStateFromSupabase<Partial<AIActState>>(m.orgId).catch(() => null),
      }))
    )
    const keys = existingClientKeys(existing)
    const nowISO = new Date().toISOString()
    const results: BulkImportResult[] = []

    for (const row of rows) {
      const orgName = typeof row.companyName === "string" ? row.companyName.trim() : ""
      const cui = normalizeCui(row.cui)
      const rowErrors = Array.isArray(row.errors) ? row.errors : []
      const rowNumber = typeof row.rowNumber === "number" ? row.rowNumber : results.length + 2
      const signals = Array.isArray(row.signals)
        ? row.signals
        : buildClientImportSignals({
            usesAi: row.usesAi,
            personalDataAi: row.personalDataAi,
            highRiskSuspected: row.highRiskSuspected,
            serviceScope: row.serviceScope,
            sendIntake: row.sendIntake,
            nowISO,
          })

      if (!orgName || orgName.length < 2 || rowErrors.length > 0) {
        results.push({
          rowNumber,
          ok: false,
          orgName: orgName || "Rând fără nume",
          message: rowErrors[0] ?? "Numele firmei este obligatoriu.",
          signals: signals.map((signal) => signal.label),
        })
        continue
      }

      const duplicateKeys = [
        cui ? `cui:${cui}` : null,
        row.externalId ? `external:${row.externalId}` : null,
        `name:${normalizeNameKey(orgName)}`,
      ].filter((value): value is string => Boolean(value))

      if (duplicateKeys.some((key) => keys.has(key))) {
        results.push({
          rowNumber,
          ok: false,
          orgName,
          message: "Client duplicat în portofoliu (CUI, external_id sau nume).",
          signals: signals.map((signal) => signal.label),
        })
        continue
      }

      try {
        const created = await createClientOrg({
          cabinetUserId: ctx.userId,
          orgName,
          cui,
        })
        const meta = draftToClientMeta({ ...row, companyName: orgName, cui, signals }, {
          createdByCabinet: ctx.userId,
          nowISO,
          source: "csv",
        })

        let intakeUrl: string | undefined
        if (meta.sendIntake && meta.intakeEmail) {
          intakeUrl = await createIntakeForClient({
            requestUrl: request.url,
            cabinetOrgId: ctx.orgId,
            cabinetUserId: ctx.userId,
            cabinetEmail: ctx.email,
            cabinetName: ctx.orgName,
            clientOrgId: created.orgId,
            clientName: orgName,
            recipientEmail: meta.intakeEmail,
            recipientName: meta.contactName,
          })
          meta.intakeLinkUrl = intakeUrl
          meta.intakeLinkCreatedAtISO = nowISO
        }

        await persistImportedClientState({
          orgId: created.orgId,
          orgName,
          meta,
          cabinetUserId: ctx.userId,
          cabinetEmail: ctx.email,
          nowISO,
        })

        duplicateKeys.forEach((key) => keys.add(key))
        results.push({
          rowNumber,
          ok: true,
          orgId: created.orgId,
          orgName,
          message: intakeUrl ? "Client creat + intake generat." : "Client creat.",
          intakeUrl,
          signals: signals.map((signal) => signal.label),
        })
      } catch (err) {
        results.push({
          rowNumber,
          ok: false,
          orgName,
          message: err instanceof Error ? err.message : "Eroare la import.",
          signals: signals.map((signal) => signal.label),
        })
      }
    }

    const imported = results.filter((result) => result.ok).length
    return NextResponse.json({
      ok: imported > 0,
      imported,
      failed: results.length - imported,
      total: results.length,
      results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare la importul clienților."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
