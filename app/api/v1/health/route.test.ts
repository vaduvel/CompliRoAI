import { describe, expect, it } from "vitest"

import { GET, OPTIONS } from "./route"

describe("GET /api/v1/health", () => {
  it("returns ok=true with version + docs URLs", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.version).toBe("v1")
    expect(json.docsUrl).toBe("/docs/api")
    expect(json.openapiUrl).toBe("/api/v1/openapi")
  })

  it("OPTIONS responds with CORS headers", async () => {
    const res = await OPTIONS()
    expect(res.status).toBe(204)
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*")
  })
})
