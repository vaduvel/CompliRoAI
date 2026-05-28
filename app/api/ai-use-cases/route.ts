import { NextResponse } from "next/server"

import {
  buildAIUseCaseDedupeKey,
  deriveAIUseCaseDraftFlags,
  evaluateAIUseCaseTriggers,
} from "@/lib/compliance/ai-use-case-trigger-engine"
import { appendComplianceEvents, createComplianceEvent } from "@/lib/compliance/events"
import type {
  AIUseCaseBusinessProcess,
  AIUseCaseDepartment,
  AIUseCaseHumanReview,
  AIUseCaseRecord,
  AIUseCaseTriState,
} from "@/lib/compliance/types"
import { getOrgContext } from "@/lib/server/org-context"
import { readState, writeState } from "@/lib/server/store"
import { upsertAIUseCasesToSupabase } from "@/lib/server/ai-use-case-store"

const TRI_STATE = new Set(["yes", "no", "unknown"])

export async function GET() {
  try {
    const state = await readState()
    return NextResponse.json({
      useCases: state.aiUseCases ?? [],
      total: state.aiUseCases?.length ?? 0,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nu am putut citi Registrul AI."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const nowISO = new Date().toISOString()
    const useCaseName = stringField(body.useCaseName) || stringField(body.name)
    const intendedPurpose = stringField(body.intendedPurpose) || stringField(body.purpose) || useCaseName
    if (!useCaseName || useCaseName.length < 2) {
      return NextResponse.json({ error: "Nume utilizare AI lipsă sau prea scurt." }, { status: 400 })
    }
    if (!intendedPurpose || intendedPurpose.length < 2) {
      return NextResponse.json({ error: "Scopul utilizării AI este obligatoriu." }, { status: 400 })
    }

    const id = `ai-use-case-${Date.now().toString(36)}-${slug(useCaseName)}`
    const draft: AIUseCaseRecord = {
      id,
      orgId: ctx.orgId,
      workspaceMode: ctx.workspaceMode,
      clientId: ctx.workspaceMode === "cabinet" ? ctx.orgId : null,
      aiProjectId: stringField(body.aiProjectId) ?? null,
      linkedAiSystemId: stringField(body.linkedAiSystemId) ?? null,
      linkedVendorId: stringField(body.linkedVendorId) ?? null,
      linkedModelId: stringField(body.linkedModelId) ?? null,
      linkedDataProcessId: stringField(body.linkedDataProcessId) ?? null,
      useCaseName,
      shortDescription: stringField(body.shortDescription) ?? null,
      department: enumField<AIUseCaseDepartment>(body.department, "unknown"),
      businessProcess: enumField<AIUseCaseBusinessProcess>(body.businessProcess, "unknown"),
      lifecycleStatus: enumField(body.lifecycleStatus, "unknown"),
      ownerName: stringField(body.ownerName) ?? null,
      ownerEmail: stringField(body.ownerEmail) ?? null,
      ownerRole: stringField(body.ownerRole) ?? null,
      intendedPurpose,
      actualUseDescription: stringField(body.actualUseDescription) ?? null,
      outOfScopeUse: stringField(body.outOfScopeUse) ?? null,
      toolName: stringField(body.toolName) ?? null,
      vendorName: stringField(body.vendorName) ?? null,
      modelName: stringField(body.modelName) ?? null,
      deploymentMode: enumField(body.deploymentMode, "unknown"),
      internalUsers: stringList(body.internalUsers),
      affectedPersons: stringList(body.affectedPersons, ["unknown"]) as AIUseCaseRecord["affectedPersons"],
      vulnerableGroups: stringList(body.vulnerableGroups, ["unknown"]) as AIUseCaseRecord["vulnerableGroups"],
      usesPersonalData: triState(body.usesPersonalData),
      usesSpecialCategoryData: triState(body.usesSpecialCategoryData),
      usesConfidentialData: triState(body.usesConfidentialData),
      usesTradeSecrets: triState(body.usesTradeSecrets),
      usesChildrenData: triState(body.usesChildrenData),
      dataCategories: stringList(body.dataCategories, ["unknown"]) as AIUseCaseRecord["dataCategories"],
      inputDataSource: stringList(body.inputDataSource, ["manual_user_input"]) as AIUseCaseRecord["inputDataSource"],
      dataRegion: enumField(body.dataRegion, "unknown"),
      transferOutsideEea: triState(body.transferOutsideEea),
      outputTypes: stringList(body.outputTypes, ["unknown"]) as AIUseCaseRecord["outputTypes"],
      autonomyLevel: enumField(body.autonomyLevel, "unknown"),
      humanReview: enumField<AIUseCaseHumanReview>(body.humanReview, "unknown"),
      publicOutput: triState(body.publicOutput),
      directInteractionWithPersons: triState(body.directInteractionWithPersons),
      automatedDecision: triState(body.automatedDecision),
      scoringOrRanking: triState(body.scoringOrRanking),
      impactsPeopleRights: triState(body.impactsPeopleRights),
      annexIIIDomain: enumField(body.annexIIIDomain, "unknown"),
      prohibitedPracticeFlags: stringList(body.prohibitedPracticeFlags, ["none"]) as AIUseCaseRecord["prohibitedPracticeFlags"],
      draftRole: "deployer",
      draftRiskLevel: "unknown",
      highRiskCandidate: false,
      prohibitedCandidate: false,
      art50TransparencyTrigger: false,
      gdprReviewNeeded: false,
      dpiNeedsReview: false,
      friaCandidate: false,
      vendorReviewNeeded: false,
      humanOversightNeeded: false,
      loggingReviewNeeded: false,
      qmsReviewNeeded: false,
      pmmReviewNeeded: false,
      incidentProcessNeeded: false,
      certaintyStatus: "self_reported",
      reviewStatus: "needs_review",
      evidenceCompletenessPct: 0,
      openFindingsCount: 0,
      source: "manual",
      sourceImportId: null,
      sourceRowNumber: null,
      sourceMagicLinkToken: null,
      sourceConfidencePct: null,
      createdAtISO: nowISO,
      createdBy: ctx.userId,
      updatedAtISO: nowISO,
      updatedBy: ctx.userId,
      archivedAtISO: null,
      archivedBy: null,
      auditVersion: 1,
      dedupeKey: "",
      consultantNotes: stringField(body.consultantNotes) ?? null,
      internalNotes: stringField(body.internalNotes) ?? null,
    }
    draft.dedupeKey = buildAIUseCaseDedupeKey({
      orgId: draft.orgId,
      clientId: draft.clientId,
      department: draft.department,
      intendedPurpose: draft.intendedPurpose,
      linkedAiSystemId: draft.linkedAiSystemId,
      toolName: draft.toolName,
    })

    const record = deriveAIUseCaseDraftFlags(draft)
    const findings = evaluateAIUseCaseTriggers(record, nowISO)
    record.openFindingsCount = findings.length

    const state = await readState()
    const duplicate = (state.aiUseCases ?? []).find((item) => item.dedupeKey === record.dedupeKey)
    if (duplicate) {
      return NextResponse.json(
        { error: "Utilizarea AI există deja pentru acest departament, scop și tool.", duplicateId: duplicate.id },
        { status: 409 }
      )
    }

    state.aiUseCases = [record, ...(state.aiUseCases ?? [])]
    state.findings = [...findings, ...(state.findings ?? [])]
    state.events = appendComplianceEvents(state, [
      ...findings.map((finding) =>
        createComplianceEvent(
          {
            type: "finding.created",
            entityType: "finding",
            entityId: finding.id,
            message: `Acțiune generată din Registru AI: ${finding.title}`,
            createdAtISO: nowISO,
            metadata: {
              source: "ai_use_case_register",
              severity: finding.severity,
              category: finding.category,
            },
          },
          { id: ctx.userId, label: ctx.email, role: "partner_manager", source: "session" }
        )
      ),
      createComplianceEvent(
        {
          type: "ai_use_case.created",
          entityType: "ai_use_case",
          entityId: record.id,
          message: `Utilizare AI adăugată în Registru AI: ${record.useCaseName}`,
          createdAtISO: nowISO,
          metadata: {
            source: "manual",
            draftRiskLevel: record.draftRiskLevel,
            reviewStatus: record.reviewStatus,
            generatedFindings: findings.length,
          },
        },
        { id: ctx.userId, label: ctx.email, role: "partner_manager", source: "session" }
      ),
    ])

    await writeState(state)
    let aiUseCaseTablePersisted = true
    let aiUseCasePersistenceWarning: string | undefined
    try {
      await upsertAIUseCasesToSupabase([record])
    } catch (err) {
      aiUseCaseTablePersisted = false
      aiUseCasePersistenceWarning =
        err instanceof Error ? err.message : "AIUseCase Supabase persistence failed."
    }

    return NextResponse.json({
      useCase: record,
      generatedFindings: findings,
      aiUseCaseTablePersisted,
      aiUseCasePersistenceWarning,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nu am putut salva utilizarea AI."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function triState(value: unknown): AIUseCaseTriState {
  return typeof value === "string" && TRI_STATE.has(value) ? (value as AIUseCaseTriState) : "unknown"
}

function enumField<T extends string>(value: unknown, fallback: T): T {
  return typeof value === "string" && value.trim() ? (value.trim() as T) : fallback
}

function stringList(value: unknown, fallback: string[] = []): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(/[;,]/g).map((item) => item.trim()).filter(Boolean)
  }
  return fallback
}

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "use-case"
}
