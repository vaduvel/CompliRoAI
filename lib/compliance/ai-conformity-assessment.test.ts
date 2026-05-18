// Sprint 026 — Tests for Art. 47 EU Declaration of Conformity + Art. 48 CE
// marking checklist generators. Anchored to:
//   - Anexa V (7 câmpuri minime DoC)
//   - Art. 48 (CE marking visible/digital/notified-body)

import { describe, it, expect } from "vitest"

import {
  CE_MARKING_CHECKLIST,
  buildCEMarkingChecklistDocument,
  buildEUDeclarationOfConformity,
  evaluateCEMarkingChecklist,
} from "./ai-conformity-assessment"

const SAMPLE_SYSTEM = {
  id: "sys-1",
  name: "AI Triage HR",
  vendor: "Acme AI",
  modelType: "transformer",
  purpose: "decision-support",
  riskLevel: "high",
  usesPersonalData: true,
  makesAutomatedDecisions: true,
  impactsRights: true,
  hasHumanReview: true,
  annexIIIHint: "Annex III pct. 4 — angajare",
  createdAtISO: new Date("2026-01-01T00:00:00Z").toISOString(),
}

describe("Art. 47 — buildEUDeclarationOfConformity (Anexa V)", () => {
  it("conține toate cele 7 câmpuri obligatorii Anexa V când inputurile sunt complete", () => {
    const doc = buildEUDeclarationOfConformity(
      SAMPLE_SYSTEM,
      {
        uniqueIdentifier: "AI-HR-2026-0001",
        providerAddress: "Strada Exemplului 1, București",
        placeOfIssue: "București",
        signerName: "Maria Popescu",
        signerTitle: "Director Conformitate",
        harmonisedStandards: ["ISO/IEC 42001:2023", "ISO/IEC 23894"],
        notifiedBody: {
          name: "Acme Notified Body",
          identificationNumber: "1234",
          assessmentProcedure: "Anexa VII — QMS + Tech Doc Assessment",
          certificateReference: "NB-1234/2026/A1",
        },
        language: "ro",
      },
      "Organizația Test SRL",
    )

    expect(doc.title).toContain("EU Declaration of Conformity")
    expect(doc.content).toContain("Art. 47 + Anexa V")
    // Câmpul 1 — sistem + cod unic
    expect(doc.content).toContain("AI Triage HR")
    expect(doc.content).toContain("AI-HR-2026-0001")
    // Câmpul 2 — provider
    expect(doc.content).toContain("Organizația Test SRL")
    expect(doc.content).toContain("Strada Exemplului 1")
    // Câmpul 3 — responsabilitate exclusivă
    expect(doc.content).toContain("responsabilitatea exclusivă")
    // Câmpul 4 — referințe legale aplicabile
    expect(doc.content).toContain("2024/1689")
    expect(doc.content).toContain("2016/679")
    // Câmpul 5 — standarde armonizate
    expect(doc.content).toContain("ISO/IEC 42001:2023")
    // Câmpul 6 — notified body
    expect(doc.content).toContain("Acme Notified Body")
    expect(doc.content).toContain("1234")
    // Câmpul 7 — loc, dată, semnatar
    expect(doc.content).toContain("București")
    expect(doc.content).toContain("Maria Popescu")
    expect(doc.content).toContain("Director Conformitate")
    // Retenție Art. 18 mentionată explicit
    expect(doc.content).toContain("Art. 18")
  })

  it("explicitează absența notified body când conformity = internal control", () => {
    const doc = buildEUDeclarationOfConformity(
      SAMPLE_SYSTEM,
      {
        uniqueIdentifier: "AI-X-001",
        providerAddress: "Adresa",
        placeOfIssue: "București",
        signerName: "X",
        signerTitle: "Y",
      },
      "Org",
    )
    expect(doc.content).toContain("Anexei VI")
    expect(doc.content).toContain("Internal Control")
  })

  it("notează când reprezentantul autorizat este desemnat (provider non-UE)", () => {
    const doc = buildEUDeclarationOfConformity(
      SAMPLE_SYSTEM,
      {
        uniqueIdentifier: "AI-X-002",
        providerAddress: "USA, California",
        placeOfIssue: "Frankfurt",
        signerName: "John",
        signerTitle: "VP",
        authorisedRepresentative: {
          name: "EU Rep GmbH",
          address: "Berlin, Germany",
        },
      },
      "Acme Inc.",
    )
    expect(doc.content).toContain("Reprezentant autorizat în UE")
    expect(doc.content).toContain("EU Rep GmbH")
    expect(doc.content).toContain("Berlin, Germany")
  })
})

describe("Art. 48 — evaluateCEMarkingChecklist", () => {
  it("ascunde itemii physical-only pentru sisteme pur digitale", () => {
    const res = evaluateCEMarkingChecklist({}, {
      hasPhysicalProduct: false,
      hasNotifiedBody: false,
    })
    // Itemii ce-2 + ce-3 (physical-product) NU sunt aplicabili.
    expect(res.gaps.some((g) => g.id === "ce-2-visible")).toBe(false)
    expect(res.gaps.some((g) => g.id === "ce-3-package-fallback")).toBe(false)
    // Itemul digital ce-4 ESTE aplicabil.
    expect(res.gaps.some((g) => g.id === "ce-4-digital-marking")).toBe(true)
    // Item notified-body NU este aplicabil.
    expect(res.gaps.some((g) => g.id === "ce-5-notified-body-id")).toBe(false)
  })

  it("verdict=blocked-critical când lipsește EU DoC (Art. 47 + Art. 48)", () => {
    const res = evaluateCEMarkingChecklist(
      { "ce-6-eu-doc-available": "no" },
      { hasPhysicalProduct: false, hasNotifiedBody: false },
    )
    expect(res.verdict).toBe("blocked-critical")
    expect(res.gaps.some((g) => g.id === "ce-6-eu-doc-available" && g.severity === "critical")).toBe(true)
  })

  it("verdict=ready-for-ce când toate aplicabile sunt yes", () => {
    const answers = Object.fromEntries(
      CE_MARKING_CHECKLIST.map((q) => [q.id, "yes" as const]),
    )
    const res = evaluateCEMarkingChecklist(answers, {
      hasPhysicalProduct: false,
      hasNotifiedBody: false,
    })
    expect(res.verdict).toBe("ready-for-ce")
    expect(res.gaps).toHaveLength(0)
  })

  it("verdict=fixes-needed dacă lacune sunt doar medium/high (nu critical)", () => {
    const res = evaluateCEMarkingChecklist(
      {
        "ce-1-applied-before-market": "yes",
        "ce-4-digital-marking": "no", // high
        "ce-6-eu-doc-available": "yes",
        "ce-7-no-misleading": "yes",
      },
      { hasPhysicalProduct: false, hasNotifiedBody: false },
    )
    expect(res.verdict).toBe("fixes-needed")
    expect(res.gaps.some((g) => g.severity === "critical")).toBe(false)
  })

  it("notified-body item devine aplicabil când hasNotifiedBody=true", () => {
    const res = evaluateCEMarkingChecklist(
      { "ce-5-notified-body-id": "no" },
      { hasPhysicalProduct: false, hasNotifiedBody: true },
    )
    expect(res.gaps.some((g) => g.id === "ce-5-notified-body-id")).toBe(true)
  })
})

describe("Art. 48 — buildCEMarkingChecklistDocument", () => {
  it("rendează verdict + itemi aplicabili + lacune", () => {
    const doc = buildCEMarkingChecklistDocument(
      SAMPLE_SYSTEM,
      {
        "ce-1-applied-before-market": "yes",
        "ce-6-eu-doc-available": "no",
      },
      { hasPhysicalProduct: false, hasNotifiedBody: false },
      "Org test",
    )
    expect(doc.title).toContain("Checklist Marcaj CE")
    expect(doc.content).toContain("Art. 48")
    expect(doc.content).toContain("Blocat") // verdict critical
    expect(doc.content).toContain("Anexa VII") // notified body context note
  })
})
