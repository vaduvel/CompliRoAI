/**
 * Sprint 012 — DORA AI Rules Engine (slice subțire, NU full DORA).
 *
 * Evaluează un `VendorRecord` cu `doraScope.material = true` pe baza
 * `OrgRegulatoryProfile`. Emite findings când lipsesc evidence-uri impuse
 * de DORA (Regulament UE 2022/2554) pentru un furnizor ICT material care
 * deservește o entitate financiară.
 *
 * Reguli implementate (per mandate § 13 — DORA AI slice):
 *   1. Art. 28-30 — ICT contractual arrangements: DPA/contract semnat
 *      obligatoriu pentru vendor material. (`dpaStatus != "signed"`)
 *   2. Art. 28(8) — Exit strategy: notă "exit" în assessmentNote sau
 *      strategy documentat (proxy: avem `subprocessorsUrl` + DPA cu data
 *      `dpaExpiresAtISO`).
 *   3. Art. 19 — Incident notification SLA: vendor trebuie să comunice
 *      incidente operaționale; impunem `incidentNotificationCommitmentHours
 *      <= 24h` pentru AI material care suportă serviciu critic financiar.
 *   4. Art. 25-27 — Risk testing & resilience: institutele de credit care
 *      folosesc AI pentru decizii de credit trebuie să documenteze
 *      resilience testing (`securityEvidence.penTestRecent`).
 *   5. Art. 28(2) — Pre-contract assessment: pentru AI care procesează
 *      date plată în PSP/EMI, vendor region non-EU declanșează review
 *      (concurrence Art. 28(3)-(5) "principle of proportionality").
 *
 * Pure function: nu scrie state, nu emite events. Doar produce un set de
 * `ScanFinding` (cu id stable `dora-ai-vendor-<vendorId>-<rule>` pentru
 * idempotency când vendor-review-store le re-emite).
 *
 * Sursa juridică: EUR-Lex Reg (UE) 2022/2554 (DORA).
 * NU se port-ează donor full DORA dashboard (Rule 3 — mandate § 13).
 */

import type {
  CompliancePrinciple,
  ComplianceSeverity,
} from "@/lib/compliance/constitution"
import type {
  DoraEntityType,
  OrgRegulatoryProfile,
  ScanFinding,
  VendorRecord,
} from "@/lib/compliance/types"

// ── Types ────────────────────────────────────────────────────────────────────

export type DoraGapKind =
  | "ict_contract_missing"           // Art. 28-30
  | "exit_strategy_undocumented"     // Art. 28(8)
  | "incident_sla_missing"           // Art. 19
  | "resilience_testing_missing"     // Art. 25-27
  | "non_eu_payment_data_review"     // Art. 28(2)-(5)
  | "expired_dpa"                    // Art. 30 — contract refresh

export type DoraEvaluation = {
  isMaterial: boolean
  gaps: DoraGapKind[]
  findings: ScanFinding[]
  /**
   * Severitatea agregată (max severity gaps). Folosit de aggregator pentru
   * sorting în UI. `low` dacă nu există gap.
   */
  aggregatedSeverity: ComplianceSeverity
}

// ── Entity-type labels (RO) ──────────────────────────────────────────────────

const ENTITY_LABELS: Record<DoraEntityType, string> = {
  credit_institution: "instituție de credit",
  payment_institution: "instituție de plată",
  emi: "instituție monedă electronică (EMI)",
  investment_firm: "societate servicii de investiții (SSIF)",
  insurance: "societate asigurare",
  ucits_aifm: "administrator fond (UCITS / AIFM)",
  crowdfunding: "platformă crowdfunding",
  crypto_casp: "furnizor servicii crypto (CASP)",
  ict_third_party: "furnizor ICT terță parte",
  not_applicable: "neaplicabil",
}

const PRINCIPLES: CompliancePrinciple[] = ["robustness", "accountability", "oversight"]

// ── Helpers ──────────────────────────────────────────────────────────────────

function nowOr(now?: string): string {
  return now ?? new Date().toISOString()
}

function isPaymentDataEntity(t: DoraEntityType): boolean {
  return t === "credit_institution" || t === "payment_institution" || t === "emi"
}

function isCreditDecisionEntity(t: DoraEntityType): boolean {
  return (
    t === "credit_institution" || t === "investment_firm" || t === "insurance"
  )
}

function escalateSeverity(
  current: ComplianceSeverity,
  next: ComplianceSeverity,
): ComplianceSeverity {
  const order: ComplianceSeverity[] = ["low", "medium", "high", "critical"]
  return order.indexOf(next) > order.indexOf(current) ? next : current
}

function buildFinding(args: {
  vendor: VendorRecord
  org: OrgRegulatoryProfile
  rule: DoraGapKind
  title: string
  detail: string
  severity: ComplianceSeverity
  legalReference: string
  remediationHint: string
  evidenceRequired: string
  nowISO: string
}): ScanFinding {
  const entityLabel = ENTITY_LABELS[args.org.doraEntityType]
  return {
    id: `dora-ai-vendor-${args.vendor.id}-${args.rule}`,
    title: args.title,
    detail: [
      args.detail,
      "",
      `Context org: ${entityLabel} (DORA aplicabil). Vendor material: "${args.vendor.name}".`,
      args.vendor.doraScope?.criticalForService
        ? `Serviciu critic suportat: ${args.vendor.doraScope.criticalForService}.`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    category: "EU_AI_ACT",
    severity: args.severity,
    risk: args.severity === "critical" || args.severity === "high" ? "high" : "low",
    principles: PRINCIPLES,
    createdAtISO: args.nowISO,
    sourceDocument: `DORA AI Vendor — ${args.vendor.name}`,
    legalReference: args.legalReference,
    remediationHint: args.remediationHint,
    evidenceRequired: args.evidenceRequired,
    ownerSuggestion: "DPO / CISO",
  }
}

// ── Main evaluator ───────────────────────────────────────────────────────────

/**
 * Evaluează un vendor DORA-material în raport cu profilul orgului.
 * Returnează findings stabile (id deterministic). Apelantul (vendor-review
 * -store) le poate dedupe pe id înainte de createFinding.
 */
export function evaluateDoraVendor(
  vendor: VendorRecord,
  org: OrgRegulatoryProfile,
  now?: string,
): DoraEvaluation {
  const nowISO = nowOr(now)

  // Gate 1: orgul nu e DORA-scoped → nimic de făcut.
  if (!org.doraApplies || org.doraEntityType === "not_applicable") {
    return {
      isMaterial: false,
      gaps: [],
      findings: [],
      aggregatedSeverity: "low",
    }
  }

  // Gate 2: vendor nu e marcat material → nimic de făcut.
  if (!vendor.doraScope?.material) {
    return {
      isMaterial: false,
      gaps: [],
      findings: [],
      aggregatedSeverity: "low",
    }
  }

  const gaps: DoraGapKind[] = []
  const findings: ScanFinding[] = []
  let aggregatedSeverity: ComplianceSeverity = "low"

  // ── Rule 1: Art. 28-30 ICT contract (DPA semnat) ───────────────────────────
  if (vendor.dpaStatus !== "signed") {
    gaps.push("ict_contract_missing")
    aggregatedSeverity = escalateSeverity(aggregatedSeverity, "critical")
    findings.push(
      buildFinding({
        vendor,
        org,
        rule: "ict_contract_missing",
        title: `DORA Art. 28-30: lipsește contractul ICT semnat pentru ${vendor.name}`,
        detail:
          "Vendor declarat material pentru un serviciu financiar, dar nu există un contract ICT semnat (DPA/MSA). DORA impune acoperire contractuală completă pentru furnizori ICT materiali, cu clauze specifice (drepturi de audit, exit strategy, incidente).",
        severity: "critical",
        legalReference: "Reg (UE) 2022/2554 (DORA) Art. 28-30",
        remediationHint:
          "Semnează un contract ICT cu clauze DORA Art. 30 (drepturi de audit, raportare incidente, exit strategy, sub-contracting controls). Atașează contractul la vendor.",
        evidenceRequired:
          "Contract ICT semnat (PDF), cu mențiune explicită Art. 30 alin. (2)-(3) DORA, sau anexa specifică DORA la DPA-ul standard.",
        nowISO,
      }),
    )
  }

  // ── Rule 2: Art. 28(8) exit strategy ───────────────────────────────────────
  const exitDocumented =
    Boolean(vendor.doraScope?.assessmentNote?.toLowerCase().includes("exit")) ||
    Boolean(vendor.dpaExpiresAtISO)
  if (!exitDocumented) {
    gaps.push("exit_strategy_undocumented")
    aggregatedSeverity = escalateSeverity(aggregatedSeverity, "high")
    findings.push(
      buildFinding({
        vendor,
        org,
        rule: "exit_strategy_undocumented",
        title: `DORA Art. 28(8): exit strategy nedocumentat pentru ${vendor.name}`,
        detail:
          "Pentru un furnizor ICT material trebuie să existe un plan de ieșire (exit strategy) care permite tranziția controlată către un alt furnizor sau internalizarea serviciului fără degradarea operațiunilor financiare.",
        severity: "high",
        legalReference: "Reg (UE) 2022/2554 (DORA) Art. 28(8)",
        remediationHint:
          "Documentează un exit plan (timeline tranziție, vendor alternativ identificat, dependențe de date, mecanisme migrare model AI). Stochează în vendor.doraScope.assessmentNote și/sau atașează ca evidence.",
        evidenceRequired:
          "Document exit strategy (PDF / Notion / Confluence) referențiat în vendor.doraScope.assessmentNote.",
        nowISO,
      }),
    )
  }

  // ── Rule 3: Art. 19 incident notification SLA ──────────────────────────────
  const incidentSla = vendor.securityEvidence.incidentNotificationCommitmentHours
  const slaInsufficient =
    typeof incidentSla !== "number" || !Number.isFinite(incidentSla) || incidentSla > 24
  if (slaInsufficient) {
    gaps.push("incident_sla_missing")
    aggregatedSeverity = escalateSeverity(aggregatedSeverity, "high")
    findings.push(
      buildFinding({
        vendor,
        org,
        rule: "incident_sla_missing",
        title: `DORA Art. 19: SLA notificare incident insuficient pentru ${vendor.name}`,
        detail:
          typeof incidentSla === "number"
            ? `Vendor declară SLA de notificare incident de ${incidentSla}h. DORA cere ca furnizorul ICT material să comunice incidentele suficient de rapid pentru a permite escaladarea reglementată (initial 24h / detailed 72h).`
            : "Vendor nu are documentat un SLA de notificare a incidentelor. DORA impune ca furnizorul ICT material să comunice incidente operaționale în timp util.",
        severity: "high",
        legalReference: "Reg (UE) 2022/2554 (DORA) Art. 19",
        remediationHint:
          "Negociază în contractul ICT un SLA ≤ 24h pentru notificare incident operațional. Documentează SLA în vendor.securityEvidence.incidentNotificationCommitmentHours.",
        evidenceRequired:
          "Clauză din contract sau MSA care prevede SLA ≤ 24h pentru incident notification (screenshot/extras PDF).",
        nowISO,
      }),
    )
  }

  // ── Rule 4: Art. 25-27 resilience testing (credit decision entities) ──────
  if (isCreditDecisionEntity(org.doraEntityType)) {
    if (!vendor.securityEvidence.penTestRecent) {
      gaps.push("resilience_testing_missing")
      aggregatedSeverity = escalateSeverity(aggregatedSeverity, "high")
      findings.push(
        buildFinding({
          vendor,
          org,
          rule: "resilience_testing_missing",
          title: `DORA Art. 25-27: testare reziliență AI absentă pentru ${vendor.name}`,
          detail:
            "Pentru o entitate financiară care folosește AI în decizii (credit/investiții/asigurare), DORA cere testare periodică a rezilienței operaționale (vulnerability assessment, pentest, scenario-based testing). Vendor-ul nu confirmă pen-test recent.",
          severity: "high",
          legalReference: "Reg (UE) 2022/2554 (DORA) Art. 25-27",
          remediationHint:
            "Solicită vendor-ului raport recent pen-test (≤ 12 luni) și include-l în Audit Pack. Pentru AI critic, derulează scenario-based testing pe modelul folosit.",
          evidenceRequired:
            "Raport pen-test ≤ 12 luni (PDF) + plan remediere documentat. Marchează vendor.securityEvidence.penTestRecent = true.",
          nowISO,
        }),
      )
    }
  }

  // ── Rule 5: Art. 28(2)-(5) — payment data → non-EU vendor pre-assessment ──
  if (isPaymentDataEntity(org.doraEntityType) && vendor.vendorRegion !== "EU") {
    const transferReviewed =
      vendor.transferMechanism === "adequacy_decision" ||
      vendor.transferMechanism === "scc_controller_processor" ||
      vendor.transferMechanism === "scc_processor_processor" ||
      vendor.transferMechanism === "bcr"
    if (!transferReviewed) {
      gaps.push("non_eu_payment_data_review")
      aggregatedSeverity = escalateSeverity(aggregatedSeverity, "high")
      findings.push(
        buildFinding({
          vendor,
          org,
          rule: "non_eu_payment_data_review",
          title: `DORA Art. 28(2)-(5): vendor non-EU pentru date plată — review obligatoriu`,
          detail:
            "Vendor-ul este localizat în afara UE și suportă AI care procesează date de plată într-o instituție de credit/PSP/EMI. DORA Art. 28 cere pre-contract assessment de proporționalitate + mecanism de transfer GDPR Art. 44-49 valid.",
          severity: "high",
          legalReference: "Reg (UE) 2022/2554 (DORA) Art. 28(2)-(5) + GDPR Art. 44-49",
          remediationHint:
            "Documentează Transfer Impact Assessment (TIA) și aplică SCC / adequacy / BCR. Marchează vendor.transferMechanism corespunzător.",
          evidenceRequired:
            "TIA semnat de DPO + copie SCC/adequacy decision document atașat la vendor.",
          nowISO,
        }),
      )
    }
  }

  // ── Rule 6: Art. 30 DPA expirat ────────────────────────────────────────────
  if (vendor.dpaStatus === "signed" && vendor.dpaExpiresAtISO) {
    const expiresAt = Date.parse(vendor.dpaExpiresAtISO)
    if (Number.isFinite(expiresAt) && expiresAt < Date.parse(nowISO)) {
      gaps.push("expired_dpa")
      aggregatedSeverity = escalateSeverity(aggregatedSeverity, "critical")
      findings.push(
        buildFinding({
          vendor,
          org,
          rule: "expired_dpa",
          title: `DORA Art. 30: contract ICT expirat pentru ${vendor.name}`,
          detail:
            "Vendor material cu contract ICT expirat. Continuarea operațiunilor fără un contract valid expune entitatea financiară la sancțiuni reglementare (DORA Art. 50) și incompliance contractuală.",
          severity: "critical",
          legalReference: "Reg (UE) 2022/2554 (DORA) Art. 30",
          remediationHint:
            "Reînnoiește/renegotiază contractul ICT cu vendor-ul. Setează un dpaExpiresAtISO viitor și revalidează clauzele Art. 30.",
          evidenceRequired:
            "Contract ICT reînnoit cu dată semnare actualizată și clauzele Art. 30 DORA prezente.",
          nowISO,
        }),
      )
    }
  }

  return {
    isMaterial: true,
    gaps,
    findings,
    aggregatedSeverity,
  }
}
