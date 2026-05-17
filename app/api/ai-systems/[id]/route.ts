/**
 * Sprint 012 — PATCH /api/ai-systems/[id]
 *
 * Endpoint îngust: actualizează doar câmpurile relevante pentru sprint 012:
 *  - nis2EntityScope (toggle NIS2 in-scope + service + note)
 *  - policyAttestationStatus (atestare politică AI — folosită ca proxy
 *    pentru logging-evidence rule)
 *
 * Nu duplicăm POST (creare). Restul câmpurilor (purpose, vendor, riskLevel)
 * se re-clasifică automat doar la creare; modificarea full vine în Sprint 015
 * (Role-aware UI / AI inventory enhanced).
 */

import { NextResponse } from "next/server"

import { mutateFreshStateForOrg } from "@/lib/server/store"
import { getOrgContext } from "@/lib/server/org-context"
import { evaluateAndMergeNis2Findings } from "@/lib/server/ai-regulatory-scope-store"
import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import type {
  AISystemAttestationStatus,
  AISystemNis2Scope,
  AISystemRecord,
} from "@/lib/compliance/types"

function actorFromContext(ctx: {
  userId: string
  email: string
}): ComplianceEventActorInput {
  return {
    id: ctx.userId,
    label: ctx.email,
    role: "compliance",
    source: "session",
  }
}

function normNis2Scope(
  raw: unknown,
  current?: AISystemNis2Scope,
): AISystemNis2Scope | undefined {
  if (raw === undefined || raw === null) return current
  if (typeof raw !== "object") return current
  const r = raw as Record<string, unknown>
  const inScope = typeof r.inScope === "boolean" ? r.inScope : current?.inScope ?? false
  return {
    inScope,
    service:
      r.service === undefined
        ? current?.service
        : typeof r.service === "string"
          ? r.service.trim() || undefined
          : current?.service,
    assessmentNote:
      r.assessmentNote === undefined
        ? current?.assessmentNote
        : typeof r.assessmentNote === "string"
          ? r.assessmentNote.trim() || undefined
          : current?.assessmentNote,
    evaluatedAtISO: current?.evaluatedAtISO,
  }
}

function isAttestation(v: unknown): v is AISystemAttestationStatus {
  return v === "attested" || v === "not-attested"
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const ctx = await getOrgContext()
    const actor = actorFromContext(ctx)
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    let updated: AISystemRecord | null = null
    let notFound = false

    await mutateFreshStateForOrg(ctx.orgId, (state) => {
      const list = state.aiSystems ?? []
      const idx = list.findIndex((s) => s.id === id)
      if (idx === -1) {
        notFound = true
        return state
      }
      const current = list[idx]
      const merged: AISystemRecord = {
        ...current,
        nis2EntityScope:
          body.nis2EntityScope === undefined
            ? current.nis2EntityScope
            : normNis2Scope(body.nis2EntityScope, current.nis2EntityScope),
        policyAttestationStatus:
          body.policyAttestationStatus === undefined
            ? current.policyAttestationStatus
            : isAttestation(body.policyAttestationStatus)
              ? body.policyAttestationStatus
              : current.policyAttestationStatus,
        policyAttestedAtISO:
          isAttestation(body.policyAttestationStatus) &&
          body.policyAttestationStatus === "attested" &&
          current.policyAttestationStatus !== "attested"
            ? new Date().toISOString()
            : current.policyAttestedAtISO,
        policyAttestedByEmail:
          isAttestation(body.policyAttestationStatus) &&
          body.policyAttestationStatus === "attested" &&
          current.policyAttestationStatus !== "attested"
            ? ctx.email
            : current.policyAttestedByEmail,
      }
      updated = merged
      const next = [...list]
      next[idx] = merged

      const now = new Date().toISOString()
      return {
        ...state,
        aiSystems: next,
        events: appendComplianceEvents(state, [
          createComplianceEvent(
            {
              type: "ai_system.updated",
              entityType: "system",
              entityId: id,
              message: `Sistem AI actualizat: "${merged.name}"${merged.nis2EntityScope?.inScope ? " · NIS2 scope: in" : ""}`,
              createdAtISO: now,
              metadata: {
                systemName: merged.name,
                nis2InScope: merged.nis2EntityScope?.inScope === true,
                policyAttested: merged.policyAttestationStatus === "attested",
              },
            },
            actor,
          ),
        ]),
      }
    })

    if (notFound || !updated) {
      return NextResponse.json({ error: "Sistemul AI nu a fost gasit." }, { status: 404 })
    }
    const persisted: AISystemRecord = updated

    // Sprint 012 — re-evaluate NIS2 AI rules dacă sistemul e in-scope.
    if (persisted.nis2EntityScope?.inScope) {
      try {
        await evaluateAndMergeNis2Findings(ctx.orgId, persisted, actor)
        // Stamp evaluatedAtISO.
        await mutateFreshStateForOrg(ctx.orgId, (state) => {
          const list = state.aiSystems ?? []
          const idx = list.findIndex((s) => s.id === id)
          if (idx === -1) return state
          const next = [...list]
          next[idx] = {
            ...next[idx],
            nis2EntityScope: next[idx].nis2EntityScope
              ? { ...next[idx].nis2EntityScope, evaluatedAtISO: new Date().toISOString() }
              : next[idx].nis2EntityScope,
          }
          return { ...state, aiSystems: next }
        })
      } catch {
        // Ne-fatal.
      }
    }

    return NextResponse.json({ system: persisted })
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
