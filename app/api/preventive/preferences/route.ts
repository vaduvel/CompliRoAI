/**
 * Sprint 022 — GET / PATCH /api/preventive/preferences
 *
 * Email preferences pentru renewal reminders: enabled, recipients, frequency,
 * per-rule toggle.
 */

import { NextResponse } from "next/server"

import {
  appendComplianceEvents,
  createComplianceEvent,
} from "@/lib/compliance/events"
import { getOrgContext } from "@/lib/server/org-context"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import type { PreventiveEmailPreferences } from "@/lib/compliance/types"

const DEFAULT_PREFS: PreventiveEmailPreferences = {
  enabled: false,
  recipientEmails: [],
  digestFrequency: "immediate",
  perRuleEnabled: {},
}

export async function GET() {
  try {
    await getOrgContext()
    const state = await readState()
    return NextResponse.json({
      preferences: state.preventiveEmailPreferences ?? DEFAULT_PREFS,
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi preferințele." },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = (await request.json()) as Partial<PreventiveEmailPreferences>
    const updated: PreventiveEmailPreferences = {
      enabled: typeof body.enabled === "boolean" ? body.enabled : false,
      recipientEmails: Array.isArray(body.recipientEmails)
        ? body.recipientEmails.filter((e) => typeof e === "string")
        : [],
      digestFrequency: body.digestFrequency ?? "immediate",
      perRuleEnabled: body.perRuleEnabled ?? {},
    }
    await mutateFreshStateForOrg(ctx.orgId, (state) => ({
      ...state,
      preventiveEmailPreferences: updated,
      events: appendComplianceEvents(state, [
        createComplianceEvent(
          {
            type: "preventive.preferences_updated",
            entityType: "system",
            entityId: "preventive-prefs",
            message: `Preferințe email preventive actualizate: enabled=${updated.enabled}, ${updated.recipientEmails.length} recipients`,
            createdAtISO: new Date().toISOString(),
            metadata: {
              enabled: updated.enabled,
              recipientCount: updated.recipientEmails.length,
            },
          },
          {
            id: ctx.userId,
            role: "compliance",
            source: "session",
            label: ctx.email,
          },
        ),
      ]),
    }))
    return NextResponse.json({ preferences: updated })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut actualiza preferințele." },
      { status: 500 },
    )
  }
}
