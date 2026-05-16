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
} from "@/lib/server/auth"
import { getOrgContext } from "@/lib/server/org-context"
import { createClientOrg } from "@/lib/server/tenancy"
import type {
  AISystemPurpose,
  AISystemRecord,
  AISystemRiskLevel,
  LiteracyRecord,
} from "@/lib/compliance/types"

type OnboardingRole = "solo" | "cabinet"

function mapRiskLevel(level: AIActRiskLevel): AISystemRiskLevel {
  if (level === "high_risk" || level === "prohibited") return "high"
  if (level === "limited_risk") return "limited"
  return "minimal"
}

function isRole(value: unknown): value is OnboardingRole {
  return value === "solo" || value === "cabinet"
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const role: OnboardingRole = isRole(body?.role) ? body.role : "solo"

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

      // Cabinet onboarding: mark complete + stash partner workspace metadata.
      state.onboarding = {
        completed: true,
        completedAtISO: nowISO,
        role,
        cabinetInfo: {
          cabinetName,
          clientScale,
        },
        currentStep: 4,
      }
      await writeState(state)

      // Optionally create first client org in same call.
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

      // Re-issue session cookie with workspaceMode=cabinet so middleware injects it.
      const cookieStore = await cookies()
      const sessionCookie = cookieStore.get(SESSION_COOKIE)
      if (sessionCookie?.value) {
        const session = verifySessionToken(sessionCookie.value)
        if (session) {
          const newToken = createSessionToken({
            userId: session.userId,
            orgId: session.orgId,
            email: session.email,
            orgName: session.orgName,
            workspaceMode: "cabinet",
          })
          const response = NextResponse.json({
            ok: true,
            destination: "/dashboard/portofoliu",
            workspaceMode: "cabinet",
          })
          response.cookies.set(SESSION_COOKIE, newToken, getSessionCookieOptions())
          return response
        }
      }

      return NextResponse.json({
        ok: true,
        destination: "/dashboard/portofoliu",
        workspaceMode: "cabinet",
      })
    }

    // SOLO flow (existing behaviour with `role: "solo"` recorded for analytics).
    const { companyInfo, firstSystem, firstLiteracy } = body ?? {}

    state.onboarding = {
      completed: true,
      completedAtISO: nowISO,
      companyInfo: companyInfo ?? undefined,
      role: "solo",
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

    return NextResponse.json({ ok: true, destination: "/dashboard/sisteme", workspaceMode: "solo" })
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
