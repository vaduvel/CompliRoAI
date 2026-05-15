import { NextResponse } from "next/server"
import { nanoid } from "nanoid"

import { readState, writeState } from "@/lib/server/store"
import { classifyAISystem, type AIActRiskLevel } from "@/lib/compliance/ai-act-classifier"
import { syncAIActObligationFindings } from "@/lib/server/obligation-sync"
import type {
  AISystemPurpose,
  AISystemRecord,
  AISystemRiskLevel,
  LiteracyRecord,
} from "@/lib/compliance/types"

function mapRiskLevel(level: AIActRiskLevel): AISystemRiskLevel {
  if (level === "high_risk" || level === "prohibited") return "high"
  if (level === "limited_risk") return "limited"
  return "minimal"
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { companyInfo, firstSystem, firstLiteracy } = body ?? {}

    const state = await readState()
    const nowISO = new Date().toISOString()

    state.onboarding = {
      completed: true,
      completedAtISO: nowISO,
      companyInfo: companyInfo ?? undefined,
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

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
