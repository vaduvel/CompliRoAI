import { describe, expect, it } from "vitest"

import { generateDsarProcessPack } from "./dsar-drafts"

describe("generateDsarProcessPack", () => {
  it("folosește un disclaimer determinist, fără mențiune generică AI", () => {
    const pack = generateDsarProcessPack({ orgName: "Medica Plus SRL" })
    const procedure = pack.assets.find((asset) => asset.id === "dsar-procedure")

    expect(procedure?.content).toContain("Document de lucru pregătit de CompliRoAI")
    expect(procedure?.content).not.toContain("generat cu ajutorul AI")
  })
})
