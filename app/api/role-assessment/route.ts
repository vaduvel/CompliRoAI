// GET /api/role-assessment
//   → Returnează evaluarea curentă a rolului (sau null dacă nu există).
//
// POST /api/role-assessment
//   Body: { answers: RoleAssessmentAnswers }
//   → Calculează rolul, salvează în state, returnează assessment-ul complet.
//
// DELETE /api/role-assessment
//   → Șterge evaluarea curentă (pentru re-evaluare completă).

import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { classifyAIActRole } from "@/lib/compliance/role-classifier"
import type {
  RoleAssessment,
  RoleAssessmentAnswer,
  RoleAssessmentAnswers,
} from "@/lib/compliance/types"
import { getOrgContext } from "@/lib/server/org-context"
import { readState, writeState } from "@/lib/server/store"

const VALID_ANSWERS: RoleAssessmentAnswer[] = ["yes", "no", "unsure"]

const ANSWER_KEYS: (keyof RoleAssessmentAnswers)[] = [
  "developsAI",
  "sellsToThirdParties",
  "usesAIInternally",
  "importsFromNonEU",
  "distributesThirdPartyAI",
  "embedsAIInPhysicalProducts",
  "personalNonCommercialUseOnly",
  "militaryOrResearchOnly",
]

function isValidAnswer(value: unknown): value is RoleAssessmentAnswer {
  return typeof value === "string" && VALID_ANSWERS.includes(value as RoleAssessmentAnswer)
}

function parseAnswers(raw: unknown): RoleAssessmentAnswers | null {
  if (!raw || typeof raw !== "object") return null
  const out: Partial<RoleAssessmentAnswers> = {}
  for (const key of ANSWER_KEYS) {
    const v = (raw as Record<string, unknown>)[key]
    if (!isValidAnswer(v)) {
      return null
    }
    out[key] = v
  }
  return out as RoleAssessmentAnswers
}

export async function GET() {
  let ctx
  try {
    ctx = await getOrgContext()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const state = await readState()
    return NextResponse.json({
      assessment: state.roleAssessment ?? null,
      orgId: ctx.orgId,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Eroare la citirea evaluării de rol."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let ctx
  try {
    ctx = await getOrgContext()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { answers?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Body invalid — așteptat JSON cu câmpul `answers`." },
      { status: 400 }
    )
  }

  const answers = parseAnswers(body.answers)
  if (!answers) {
    return NextResponse.json(
      {
        error:
          "Răspunsuri invalide. Toate cele 8 întrebări trebuie să aibă valoarea 'yes', 'no' sau 'unsure'.",
        expectedKeys: ANSWER_KEYS,
      },
      { status: 400 }
    )
  }

  const classification = classifyAIActRole(answers)
  const assessment: RoleAssessment = {
    id: `role-${randomUUID()}`,
    primaryRole: classification.primaryRole,
    secondaryRoles: classification.secondaryRoles,
    reasoning: classification.reasoning,
    applicableArticles: classification.applicableArticles,
    scopeExceptions: classification.scopeExceptions,
    answeredAtISO: new Date().toISOString(),
    answeredByEmail: ctx.email,
    answers,
  }

  try {
    const state = await readState()
    state.roleAssessment = assessment
    await writeState(state)
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Eroare la salvarea evaluării de rol."
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ assessment }, { status: 200 })
}

export async function DELETE() {
  try {
    await getOrgContext()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const state = await readState()
    state.roleAssessment = undefined
    await writeState(state)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Eroare la ștergerea evaluării de rol."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
