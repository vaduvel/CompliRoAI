import { describe, expect, it } from "vitest"

import { GET } from "./route"

describe("GET /api/v1/openapi", () => {
  it("returns valid OpenAPI 3.1 JSON describing the v1 paths", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const spec = await res.json()
    expect(spec.openapi).toBe("3.1.0")
    expect(spec.info.title).toContain("CompliRoAI")
    expect(spec.paths["/api/v1/classify"].post).toBeDefined()
    expect(spec.paths["/api/v1/gate"].post).toBeDefined()
    expect(spec.paths["/api/v1/deployment"].post).toBeDefined()
    expect(spec.paths["/api/v1/keys"].get).toBeDefined()
    expect(spec.paths["/api/v1/keys"].post).toBeDefined()
    expect(spec.paths["/api/v1/keys/{id}"].delete).toBeDefined()
    expect(spec.paths["/api/v1/health"].get).toBeDefined()
    expect(spec.components.securitySchemes.bearerAuth).toBeDefined()
  })
})
