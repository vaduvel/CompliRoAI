import { NextResponse } from "next/server"
import { classifyAISystem } from "@/lib/compliance/ai-act-classifier"
import type { AISystemPurpose } from "@/lib/compliance/types"

const VALID_PURPOSES: AISystemPurpose[] = [
  "hr-screening",
  "credit-scoring",
  "biometric-identification",
  "fraud-detection",
  "marketing-personalization",
  "support-chatbot",
  "document-assistant",
  "image-manipulation-intimate",
  "other",
]

type RateBucket = { count: number; windowStart: number }
const rateBuckets = new Map<string, RateBucket>()
const RATE_LIMIT_PER_MIN = 60

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const bucket = rateBuckets.get(key)

  if (!bucket || now - bucket.windowStart > 60_000) {
    rateBuckets.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: RATE_LIMIT_PER_MIN - 1 }
  }

  if (bucket.count >= RATE_LIMIT_PER_MIN) {
    return { allowed: false, remaining: 0 }
  }

  bucket.count++
  return { allowed: true, remaining: RATE_LIMIT_PER_MIN - bucket.count }
}

function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp
  return "anonymous"
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rl = checkRateLimit(ip)

  if (!rl.allowed) {
    return NextResponse.json(
      {
        eroare: "Prea multe cereri. Maxim 60/minut per IP.",
        cod: "RATE_LIMITED",
      },
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          "Retry-After": "60",
          "X-RateLimit-Limit": String(RATE_LIMIT_PER_MIN),
          "X-RateLimit-Remaining": "0",
        },
      }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      {
        eroare: "Body invalid. Trimite JSON cu cheia 'scop'.",
        cod: "INVALID_JSON",
        exemplu: { scop: "hr-screening" },
      },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const scop = (body as { scop?: string })?.scop

  if (!scop || typeof scop !== "string") {
    return NextResponse.json(
      {
        eroare: "Câmpul 'scop' este obligatoriu și trebuie să fie string.",
        cod: "MISSING_PURPOSE",
        valori_acceptate: VALID_PURPOSES,
      },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  if (!VALID_PURPOSES.includes(scop as AISystemPurpose)) {
    return NextResponse.json(
      {
        eroare: `Scop necunoscut: '${scop}'.`,
        cod: "INVALID_PURPOSE",
        valori_acceptate: VALID_PURPOSES,
      },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const classification = classifyAISystem(scop as AISystemPurpose)

  return NextResponse.json(
    {
      scop,
      nivel_risc: classification.riskLevel,
      articol: classification.article,
      motiv: classification.reason,
      deadline: classification.deadline ?? null,
      obligatii: classification.requiredActions,
      sursa: {
        regulament: "EU AI Act (Regulamentul UE 2024/1689)",
        actualizat: "Omnibus Agreement 7 mai 2026 — high-risk Annex III mutat la 2027-12-02",
      },
      disclaimer:
        "Clasificare automată orientativă. Pentru evaluare oficială consultă un avocat specializat în Tech/IT.",
    },
    {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "X-RateLimit-Limit": String(RATE_LIMIT_PER_MIN),
        "X-RateLimit-Remaining": String(rl.remaining),
        "Cache-Control": "public, max-age=86400",
      },
    }
  )
}
