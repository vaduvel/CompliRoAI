/**
 * Sprint 008D — Tests pentru breach-narrative generators (Art. 33 + Art. 34).
 *
 * Acopera structura cheie a notificarilor: Art. 33(3) include toate elementele
 * obligatorii; Art. 34(2) e in limbaj clar accesibil persoanei vizate.
 */

import { describe, expect, it } from "vitest"

import {
  generateAnspdcpNotification,
  generateSubjectNotification,
} from "@/lib/compliance/breach-narrative"
import type { BreachRecord } from "@/lib/compliance/types"

function baseBreach(overrides: Partial<BreachRecord> = {}): BreachRecord {
  const discoveredAt = "2026-05-17T08:00:00.000Z"
  const deadline = new Date(new Date(discoveredAt).getTime() + 72 * 3_600_000).toISOString()
  return {
    id: "breach-narr-1",
    orgId: "org-test",
    title: "Acces neautorizat la fileserver HR",
    description: "Un fileserver intern HR a fost accesat de o persoană neautorizată.",
    cause: "cyberattack",
    discoveredAtISO: discoveredAt,
    deadlineISO: deadline,
    severity: "high",
    dataCategories: ["identification", "employee", "financial"],
    affectedSubjectsCount: 120,
    affectedSubjectsCategories: ["Angajați activi"],
    affectedSystems: ["fileserver-hr", "Active Directory"],
    likelyConsequences: "Posibilă utilizare a CNP / IBAN pentru fraudă financiară.",
    highRiskToRights: true,
    containmentMeasures: ["Resetare parole AD", "Izolare fileserver"],
    preventionMeasures: ["MFA pe AD", "Audit acces lunar"],
    anspdcpNotificationRequired: true,
    subjectNotificationRequired: true,
    status: "anspdcp_required",
    assignedToEmail: "dpo@test.ro",
    evidenceVaultIds: [],
    createdAtISO: discoveredAt,
    updatedAtISO: discoveredAt,
    ...overrides,
  }
}

describe("breach-narrative — generateAnspdcpNotification", () => {
  it("include toate elementele Art. 33(3) obligatorii", () => {
    const md = generateAnspdcpNotification(baseBreach(), "Acme SRL", baseBreach().discoveredAtISO)

    expect(md).toContain("Notificare incident de securitate")
    expect(md).toContain("GDPR Art. 33")
    expect(md).toContain("Operator:** Acme SRL")
    expect(md).toContain("Acces neautorizat la fileserver HR")
    // 1. Natura
    expect(md).toContain("1. Natura încălcării securității datelor")
    expect(md).toContain("Atac cibernetic")
    // 2. Cronologie
    expect(md).toContain("Termen legal de 72h")
    // 3. Persoane vizate
    expect(md).toContain("Număr aproximativ de persoane afectate:** 120")
    expect(md).toContain("Angajați activi")
    // 4. Categorii date
    expect(md).toContain("Date de identificare")
    expect(md).toContain("Date angajați")
    expect(md).toContain("Date financiare")
    // 5. Consecinte
    expect(md).toContain("Posibilă utilizare a CNP")
    // 6. Masuri
    expect(md).toContain("Resetare parole AD")
    expect(md).toContain("MFA pe AD")
    // 7. Contact
    expect(md).toContain("dpo@test.ro")
    // 8. Art. 34
    expect(md).toContain("Notificare către persoanele vizate")
  })

  it("afiseaza referenceNumber + submittedAt cand notificarea e marcata trimisa", () => {
    const breach = baseBreach({
      anspdcpNotification: {
        status: "submitted",
        submittedAtISO: "2026-05-18T10:00:00.000Z",
        referenceNumber: "ANSPDCP-2026-12345",
      },
    })
    const md = generateAnspdcpNotification(breach, "Acme SRL")
    expect(md).toContain("ANSPDCP-2026-12345")
    expect(md).toContain("Notificare către ANSPDCP")
  })

  it("include justificarea depasirii termenului 72h cand e setata", () => {
    const breach = baseBreach({
      anspdcpNotification: {
        status: "submitted",
        submittedAtISO: "2026-05-20T10:00:00.000Z",
        referenceNumber: "ANSPDCP-2026-99",
        delayJustification: "Incidentul a fost confirmat tehnic abia la 96h dupa descoperire.",
      },
    })
    const md = generateAnspdcpNotification(breach, "Acme SRL")
    expect(md).toContain("Justificare depășire termen 72h")
    expect(md).toContain("Incidentul a fost confirmat tehnic")
  })

  it("marcheaza Art. 34 ca non-necesar cand subjectNotificationRequired=false", () => {
    const breach = baseBreach({
      subjectNotificationRequired: false,
      highRiskToRights: false,
    })
    const md = generateAnspdcpNotification(breach, "Acme SRL")
    expect(md).toContain("Nu — risc redus")
  })
})

describe("breach-narrative — generateSubjectNotification", () => {
  it("returneaza o comunicare clara catre persoana vizata cu toate sectiunile Art. 34(2)", () => {
    const md = generateSubjectNotification(baseBreach(), "Acme SRL")

    expect(md).toContain("Comunicare către dumneavoastră")
    expect(md).toContain("Acme SRL")
    expect(md).toContain("Ce s-a întâmplat")
    expect(md).toContain("Ce date au fost afectate")
    expect(md).toContain("Care sunt posibilele consecințe")
    expect(md).toContain("Ce am făcut și ce facem")
    expect(md).toContain("Ce puteți face dumneavoastră")
    expect(md).toContain("Cum ne puteți contacta")
    expect(md).toContain("dpo@test.ro")
    expect(md).toContain("ANSPDCP")
  })

  it("foloseste placeholder daca contactul DPO lipseste", () => {
    const breach = baseBreach({ assignedToEmail: undefined })
    const md = generateSubjectNotification(breach, "Acme SRL")
    expect(md).toContain("_de completat: email DPO")
  })

  it("listeaza categoriile de date in limbaj clar (labels RO)", () => {
    const md = generateSubjectNotification(baseBreach(), "Acme SRL")
    expect(md).toContain("Date de identificare")
    expect(md).toContain("Date angajați")
  })
})
