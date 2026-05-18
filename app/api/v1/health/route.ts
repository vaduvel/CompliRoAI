// Sprint 023 — Public health endpoint. No auth, no rate limit (cached at edge
// by clients). Returns API version + docs URL so SDK clients can verify they
// are talking to a supported server.

import { NextResponse } from "next/server"

import { V1_API_VERSION } from "@/lib/compliance/api-v1-schema"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      version: V1_API_VERSION,
      apiVersion: V1_API_VERSION,
      service: "compliroai",
      docsUrl: "/docs/api",
      openapiUrl: "/api/v1/openapi",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "public, max-age=60",
      },
    },
  )
}
