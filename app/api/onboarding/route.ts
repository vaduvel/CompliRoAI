import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { nanoid } from "nanoid"

import { readState, writeState } from "@/lib/server/store"
import { classifyAISystem, type AIActRiskLevel } from "@/lib/compliance/ai-act-classifier"
import { syncAIActObligationFindings } from "@/lib/server/obligation-sync"
import {
  SESSION_COOKIE,
  createSessionToken,
  getSessionCookieOptions,
  verifySessionToken,
  type WorkspaceMode,
} from "@/lib/server/auth"
import { getOrgContext } from "@/lib/server/org-context"
import { createClientOrg } from "@/lib/server/tenancy"
import type {
  AISystemPurpose,
  AISystemRecord,
  AISystemRiskLevel,
  LiteracyRecord,
} from "@/lib/compliance/types"

/**
 * Sprint 015 — onboarding accepts 3 roles aligned with workspace modes:
 *   - imm-classic (companies using AI internally/externally)
 *   - ai-builder  (companies building AI)
 *   - cabinet     (consultancy/DPO managing portfolios)
 *
 * Legacy "solo" is normalized to "imm-classic". The recorded
 * `onboarding.role` keeps the legacy two-value enum ("solo" | "cabinet") for
 * existing state-typed code paths; the new workspaceMode is stored in the
 * session cookie + state.onboarding.workspaceMode.
 */
type OnboardingRole = "imm-classic" | "ai-builder" | "cabinet"

function mapRiskLevel(level: AIActRiskLevel): AISystemRiskLevel {
  if (level === "high_risk" || level === "prohibited") return "high"
  if (level === "limited_risk") return "limited"
  return "minimal"
}

function isRole(value: unknown): value is OnboardingRole {
  return value === "imm-classic" || value === "ai-builder" || value === "cabinet" || value === "solo"
}

function normalizeRole(value: unknown): OnboardingRole {
  if (value === "cabinet") return "cabinet"
  if (value === "ai-builder") return "ai-builder"
  // "solo" (legacy) + "imm-classic" + anything else → imm-classic.
  return "imm-classic"
}

function workspaceModeFor(role: OnboardingRole): WorkspaceMode {
  if (role === "cabinet") return "cabinet"
  if (role === "ai-builder") return "ai-builder"
  return "imm-classic"
}

function destinationFor(role: OnboardingRole): string {
  if (role === "cabinet") return "/dashboard/portofoliu"
  if (role === "ai-builder") return "/dashboard"
  return "/dashboard/sisteme"
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const inputRole = isRole(body?.role) ? body.role : "imm-classic"
    const role = normalizeRole(inputRole)
    const workspaceMode = workspaceModeFor(role)
    const destination = destinationFor(role)

    const state = await readState()
    const nowISO = new Date().toISOString()

    if (role === "cabinet") {
      const cabinetName: string =
        typeof body?.cabinetInfo?.cabinetName === "string"
          ? String(body.cabinetInfo.cabinetName).trim()
          : ""
      const clientScale: string =
        typeof body?.cabinetInfo?.clientScale === "string"
          ? String(body.cabinetInfo.clientScale)
          : ""

      state.onboarding = {
        completed: true,
        completedAtISO: nowISO,
        role: "cabinet",
        workspaceMode: "cabinet",
        cabinetInfo: {
          cabinetName,
          clientScale,
        },
        currentStep: 4,
      }
      await writeState(state)

      const firstClient = body?.firstClient
      const orgCtx = await getOrgContext()
      if (
        firstClient &&
        typeof firstClient?.name === "string" &&
        firstClient.name.trim().length > 0
      ) {
        try {
          await createClientOrg({
            cabinetUserId: orgCtx.userId,
            orgName: String(firstClient.name).trim(),
            cui: typeof firstClient?.cui === "string" ? String(firstClient.cui).trim() : undefined,
          })
        } catch {
          // Swallow — onboarding completed, user can re-add client from portfolio.
        }
      }

      return reissueSessionAndRespond({ workspaceMode, destination })
    }

    if (role === "ai-builder") {
      const companyInfo = body?.companyInfo
      const builderInfo = body?.builderInfo
      state.onboarding = {
        completed: true,
        completedAtISO: nowISO,
        role: "solo", // legacy enum still required by AIActOnboardingState
        workspaceMode: "ai-builder",
        companyInfo: companyInfo ?? undefined,
        builderInfo: {
          ctoEmail:
            typeof builderInfo?.ctoEmail === "string" ? builderInfo.ctoEmail : undefined,
          firstModelDeployed:
            typeof builderInfo?.firstModelDeployed === "string"
              ? builderInfo.firstModelDeployed
              : undefined,
          customerFacing:
            typeof builderInfo?.customerFacing === "boolean"
              ? builderInfo.customerFacing
              : undefined,
        },
        currentStep: 4,
      }
      await writeState(state)
      return reissueSessionAndRespond({ workspaceMode, destination })
    }

    // imm-classic flow (with optional first system + literacy)
    const { companyInfo, firstSystem, firstLiteracy } = body ?? {}

    state.onboarding = {
      completed: true,
      completedAtISO: nowISO,
      companyInfo: companyInfo ?? undefined,
      role: "solo", // legacy enum
      workspaceMode: "imm-classic",
      currentStep: 4,
    }

    let createdSystem: AISystemRecord | null = null

    if (firstSystem?.name && firstSystem?.purpose) {
      const classification = classifyAISystem(firstSystem.purpose as AISystemPurpose)
      const system: AISystemRecord = {
        id: nanoid(),
        name: String(firstSystem.name),
        purpose: firstSystem.purpose as AISystemPurpose,
        vendor: firstSystem.vendor ? String(firstSystem.vendor) : "",
        modelType: "",
        usesPersonalData: false,
        makesAutomatedDecisions: false,
        impactsRights: false,
        hasHumanReview: false,
        riskLevel: mapRiskLevel(classification.riskLevel),
        annexIIIHint: classification.article.startsWith("Annex")
          ? classification.article
          : undefined,
        recommendedActions: classification.requiredActions,
        createdAtISO: nowISO,
        approvalStatus: "pending",
        policyAttestationStatus: "not-attested",
      }
      state.aiSystems.push(system)
      createdSystem = system
    }

    if (firstLiteracy?.employeeName && firstLiteracy?.trainingDate) {
      const record: LiteracyRecord = {
        id: nanoid(),
        employeeName: String(firstLiteracy.employeeName),
        role: "",
        trainingDate: String(firstLiteracy.trainingDate),
        trainingType:
          (firstLiteracy.trainingType as LiteracyRecord["trainingType"]) ?? "intern",
        topicsCovered: ["Utilizare responsabilă AI", "Obligații Art. 4 EU AI Act"],
        trainerName: "",
        durationHours:
          typeof firstLiteracy.durationHours === "number"
            ? firstLiteracy.durationHours
            : Number(firstLiteracy.durationHours) || 1,
        attestationSigned: false,
        createdAtISO: nowISO,
      }
      state.literacyRecords.push(record)
    }

    await writeState(state)

    if (createdSystem) {
      void syncAIActObligationFindings(createdSystem, nowISO).catch(() => {})
    }

    return reissueSessionAndRespond({ workspaceMode, destination })
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

/**
 * Re-issues the session cookie with the new workspaceMode so middleware sees
 * the right value on the very next request (the dashboard layout reads it).
 */
async function reissueSessionAndRespond(args: {
  workspaceMode: WorkspaceMode
  destination: string
}): Promise<NextResponse> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE)

  const baseBody = {
    ok: true,
    destination: args.destination,
    workspaceMode: args.workspaceMode,
  }

  if (!sessionCookie?.value) {
    return NextResponse.json(baseBody)
  }
  const session = verifySessionToken(sessionCookie.value)
  if (!session) {
    return NextResponse.json(baseBody)
  }
  const newToken = createSessionToken({
    userId: session.userId,
    orgId: session.orgId,
    email: session.email,
    orgName: session.orgName,
    workspaceMode: args.workspaceMode,
  })
  const response = NextResponse.json(baseBody)
  response.cookies.set(SESSION_COOKIE, newToken, getSessionCookieOptions())
  return response
}
