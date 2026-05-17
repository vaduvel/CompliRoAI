/**
 * Sprint 012 — NIS2 AI Rules Engine (slice subțire, NU full NIS2).
 *
 * Evaluează un `AISystemRecord` cu `nis2EntityScope.inScope = true` pe baza
 * `OrgRegulatoryProfile`. Emite findings pentru obligații NIS2 (Directiva
 * UE 2022/2555 + OUG 155/2024 RO) când un sistem AI susține un serviciu
 * esențial/important.
 *
 * Reguli implementate (per mandate § 13 — NIS2 AI slice):
 *   1. Art. 21 — measures: AI critic fără human review documentat e o
 *      lacună de oversight care, în context NIS2, devine vulnerabilitate
 *      operațională.
 *   2. Art. 23 — incident escalation (3 etape): orgul trebuie să poată
 *      escalada în 24h / 72h / 1 lună. Dacă sistemul AI nu are documentat
 *      flow de escalare sau dacă vendor incident SLA > 24h (din state),
 *      emit finding.
 *   3. Art. 21(2)(c) — business continuity: AI care impactează drepturi
 *      (impactsRights=true) sau decizii automate (makesAutomatedDecisions
 *      =true) în context essential trebuie să aibă plan de backup
 *      operațional (proxy: prezența `recommendedActions` în registry).
 *   4. Art. 21(2)(e) — supply chain security: dacă vendorul AI e
 *      necunoscut sau nedocumentat (vendor=""), emit finding.
 *   5. Art. 21(2)(g) — logging evidence: AI critic într-o entitate
 *      essential/important trebuie să aibă logging operațional. Sprint 018
 *      va aduce logging-store; aici emitem doar finding placeholder dacă
 *      `policyAttestationStatus !== "attested"` (proxy că politica nu e
 *      ratificată).
 *   6. Banking/financial overlap: dacă orgul e în sector banking sau
 *      financial_markets, AI esențial declanșează automat un finding
 *      de coordonare cu DORA (Art. 1(5) NIS2 — financial entities
 *      governate primar de DORA; impunem doc reciproc).
 *
 * Pure function. Findings au id stabil (`nis2-ai-system-<id>-<rule>`).
 *
 * Sursa juridică: Directiva (UE) 2022/2555 + OUG 155/2024.
 * NU full NIS2 incident management (Rule 3).
 */

import type {
  CompliancePrinciple,
  ComplianceSeverity,
} from "@/lib/compliance/constitution"
import type {
  AISystemRecord,
  Nis2EntityClass,
  Nis2Sector,
  OrgRegulatoryProfile,
  ScanFinding,
} from "@/lib/compliance/types"

// ── Types ────────────────────────────────────────────────────────────────────

export type Nis2GapKind =
  | "human_oversight_missing"           // Art. 21
  | "incident_escalation_undocumented"  // Art. 23
  | "business_continuity_missing"       // Art. 21(2)(c)
  | "supply_chain_unknown_vendor"       // Art. 21(2)(e)
  | "logging_evidence_missing"          // Art. 21(2)(g)
  | "dora_nis2_coordination_missing"    // Art. 1(5) — financial overlap

export type Nis2Evaluation = {
  inScope: boolean
  gaps: Nis2GapKind[]
  findings: ScanFinding[]
  aggregatedSeverity: ComplianceSeverity
}

// ── Labels (RO) ──────────────────────────────────────────────────────────────

const ENTITY_LABELS: Record<Nis2EntityClass, string> = {
  essential: "esențială",
  important: "importantă",
  not_in_scope: "neaplicabil",
}

const PRINCIPLES: CompliancePrinciple[] = ["robustness", "oversight", "accountability"]

const FINANCIAL_OVERLAP_SECTORS: Nis2Sector[] = ["banking", "financial_markets"]

// ── Helpers ──────────────────────────────────────────────────────────────────

function nowOr(now?: string): string {
  return now ?? new Date().toISOString()
}

function escalateSeverity(
  current: ComplianceSeverity,
  next: ComplianceSeverity,
): ComplianceSeverity {
  const order: ComplianceSeverity[] = ["low", "medium", "high", "critical"]
  return order.indexOf(next) > order.indexOf(current) ? next : current
}

function classBaseSeverity(cls: Nis2EntityClass): ComplianceSeverity {
  // essential = severitate amplificată față de important (sancțiuni mai dure
  // per Art. 34 NIS2: până la 10M EUR / 2% turnover global vs 7M / 1.4%).
  return cls === "essential" ? "critical" : "high"
}

function buildFinding(args: {
  system: AISystemRecord
  org: OrgRegulatoryProfile
  rule: Nis2GapKind
  title: string
  detail: string
  severity: ComplianceSeverity
  legalReference: string
  remediationHint: string
  evidenceRequired: string
  nowISO: string
}): ScanFinding {
  const entityLabel = ENTITY_LABELS[args.org.nis2EntityClass]
  return {
    id: `nis2-ai-system-${args.system.id}-${args.rule}`,
    title: args.title,
    detail: [
      args.detail,
      "",
      `Context org: entitate ${entityLabel} NIS2 (sectoare: ${args.org.nis2Sectors.join(", ") || "—"}).`,
      args.system.nis2EntityScope?.service
        ? `Serviciu suportat: ${args.system.nis2EntityScope.service}.`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    category: "NIS2",
    severity: args.severity,
    risk: args.severity === "critical" || args.severity === "high" ? "high" : "low",
    principles: PRINCIPLES,
    createdAtISO: args.nowISO,
    sourceDocument: `NIS2 AI System — ${args.system.name}`,
    legalReference: args.legalReference,
    remediationHint: args.remediationHint,
    evidenceRequired: args.evidenceRequired,
    ownerSuggestion: "CISO / DPO",
  }
}

// ── Main evaluator ───────────────────────────────────────────────────────────

/**
 * Evaluează un sistem AI declarat NIS2-scoped vs profilul orgului.
 * Findings au id stabil → idempotent în re-emit.
 */
export function evaluateNis2AISystem(
  system: AISystemRecord,
  org: OrgRegulatoryProfile,
  now?: string,
): Nis2Evaluation {
  const nowISO = nowOr(now)

  // Gate 1: org nu e NIS2-scoped → nimic.
  if (org.nis2EntityClass === "not_in_scope") {
    return {
      inScope: false,
      gaps: [],
      findings: [],
      aggregatedSeverity: "low",
    }
  }

  // Gate 2: sistemul nu e marcat in-scope → nimic.
  if (!system.nis2EntityScope?.inScope) {
    return {
      inScope: false,
      gaps: [],
      findings: [],
      aggregatedSeverity: "low",
    }
  }

  const gaps: Nis2GapKind[] = []
  const findings: ScanFinding[] = []
  let aggregatedSeverity: ComplianceSeverity = "low"
  const baseSev = classBaseSeverity(org.nis2EntityClass)

  // ── Rule 1: Art. 21 — human oversight on AI in critical service ───────────
  if (!system.hasHumanReview) {
    gaps.push("human_oversight_missing")
    aggregatedSeverity = escalateSeverity(aggregatedSeverity, baseSev)
    findings.push(
      buildFinding({
        system,
        org,
        rule: "human_oversight_missing",
        title: `NIS2 Art. 21: lipsește human oversight pentru sistem AI critic "${system.name}"`,
        detail:
          "Sistemul AI susține un serviciu NIS2 esențial/important dar nu are documentat un mecanism de human review/override. Art. 21(2)(a) NIS2 cere politici și proceduri de gestionare a riscurilor; pentru AI critic, supravegherea umană este o măsură proporțională.",
        severity: baseSev,
        legalReference: "Directiva (UE) 2022/2555 (NIS2) Art. 21(2)(a)",
        remediationHint:
          "Definește responsabil human-in-the-loop (CISO/responsabil serviciu), protocol de override, log decizii AI vs intervenții umane. Setează AISystemRecord.hasHumanReview = true și atașează protocol.",
        evidenceRequired:
          "Protocol human oversight (PDF/wiki) + roster responsabili + 1 log demonstrativ intervenție umană.",
        nowISO,
      }),
    )
  }

  // ── Rule 2: Art. 23 — incident escalation 24h/72h/1m flow ─────────────────
  // Proxy: dacă sistemul AI nu are recommendedActions cu mențiune de incident
  // escalation, presupunem flow lipsă. (Sprint 020 va aduce incident-store
  // dedicat.)
  const incidentDocumented = system.recommendedActions.some((a) =>
    /incident|escal|notif|24h|72h|raport/i.test(a),
  )
  if (!incidentDocumented) {
    gaps.push("incident_escalation_undocumented")
    aggregatedSeverity = escalateSeverity(aggregatedSeverity, baseSev)
    findings.push(
      buildFinding({
        system,
        org,
        rule: "incident_escalation_undocumented",
        title: `NIS2 Art. 23: procedură escalare incident absentă pentru "${system.name}"`,
        detail:
          "NIS2 Art. 23 cere notificare în 3 etape: early warning (24h), raport complet (72h), raport final (1 lună). Pentru un sistem AI critic, organizația trebuie să poată detecta + escalada un incident operațional în acest timeframe.",
        severity: baseSev,
        legalReference: "Directiva (UE) 2022/2555 (NIS2) Art. 23 + OUG 155/2024 Art. 23",
        remediationHint:
          "Documentează playbook incident escalare (DNSC contact, escalation tree, template raportare). Sprint 020 va aduce un modul Incident dedicat — până atunci, atașează playbook ca evidence pe finding.",
        evidenceRequired:
          "Playbook incident response (PDF/wiki) + lista contacte DNSC + responsabil escalare.",
        nowISO,
      }),
    )
  }

  // ── Rule 3: Art. 21(2)(c) — business continuity ───────────────────────────
  if (system.makesAutomatedDecisions || system.impactsRights) {
    const continuityDocumented = system.recommendedActions.some((a) =>
      /backup|continui|recovery|disaster|failover|fallback/i.test(a),
    )
    if (!continuityDocumented) {
      gaps.push("business_continuity_missing")
      aggregatedSeverity = escalateSeverity(aggregatedSeverity, "high")
      findings.push(
        buildFinding({
          system,
          org,
          rule: "business_continuity_missing",
          title: `NIS2 Art. 21(2)(c): plan continuitate operațională absent pentru "${system.name}"`,
          detail:
            "AI cu decizii automate sau impact pe drepturi într-o entitate NIS2 trebuie să aibă plan de continuitate operațională: ce se întâmplă dacă AI-ul devine indisponibil? Fallback manual, model alternativ, escalare?",
          severity: "high",
          legalReference: "Directiva (UE) 2022/2555 (NIS2) Art. 21(2)(c)",
          remediationHint:
            "Documentează business continuity plan pentru AI: trigger fallback, responsabil, RTO/RPO. Adaugă la AISystemRecord.recommendedActions o linie 'fallback documented' și atașează planul ca evidence.",
          evidenceRequired:
            "Business Continuity Plan (PDF) cu secțiune dedicată AI + test BCP recent.",
          nowISO,
        }),
      )
    }
  }

  // ── Rule 4: Art. 21(2)(e) — supply chain (unknown vendor) ─────────────────
  if (!system.vendor || system.vendor.trim().length === 0) {
    gaps.push("supply_chain_unknown_vendor")
    aggregatedSeverity = escalateSeverity(aggregatedSeverity, baseSev)
    findings.push(
      buildFinding({
        system,
        org,
        rule: "supply_chain_unknown_vendor",
        title: `NIS2 Art. 21(2)(e): vendor AI necunoscut pentru "${system.name}"`,
        detail:
          "Sistem AI critic fără vendor documentat. NIS2 cere supply-chain security: trebuie să știi cine furnizează componentele critice, ce SLA au, ce evaluare de risc s-a făcut.",
        severity: baseSev,
        legalReference: "Directiva (UE) 2022/2555 (NIS2) Art. 21(2)(e)",
        remediationHint:
          "Completează câmpul vendor în AI inventory + creează un VendorRecord în /dashboard/vendor-review cu securityEvidence completat.",
        evidenceRequired:
          "Înregistrare vendor în registrul AI cu vendor != \"\" + VendorRecord linked în vendor-review.",
        nowISO,
      }),
    )
  }

  // ── Rule 5: Art. 21(2)(g) — logging evidence ──────────────────────────────
  if (system.policyAttestationStatus !== "attested") {
    gaps.push("logging_evidence_missing")
    aggregatedSeverity = escalateSeverity(aggregatedSeverity, "high")
    findings.push(
      buildFinding({
        system,
        org,
        rule: "logging_evidence_missing",
        title: `NIS2 Art. 21(2)(g): politică logging neratificată pentru "${system.name}"`,
        detail:
          "Sistem AI critic fără atestare politică (operațional + securitate). NIS2 impune logging operațional și politici documentate de securitate; pentru un sistem AI esențial, politica trebuie semnată/atestată de un responsabil intern.",
        severity: "high",
        legalReference:
          "Directiva (UE) 2022/2555 (NIS2) Art. 21(2)(g) + AI Act Art. 12 (logging — full în Sprint 018)",
        remediationHint:
          "Marchează policyAttestationStatus = 'attested' după ce un responsabil semnează politica AI. Sprint 018 va aduce logging evidence-store dedicat.",
        evidenceRequired:
          "Politică AI semnată/atestată (PDF) + log retention policy + 1 sample log recent.",
        nowISO,
      }),
    )
  }

  // ── Rule 6: Art. 1(5) NIS2 — financial overlap → coordinate with DORA ─────
  const financialSectorOverlap = org.nis2Sectors.some((s) =>
    FINANCIAL_OVERLAP_SECTORS.includes(s),
  )
  if (financialSectorOverlap && !org.doraApplies) {
    gaps.push("dora_nis2_coordination_missing")
    aggregatedSeverity = escalateSeverity(aggregatedSeverity, "medium")
    findings.push(
      buildFinding({
        system,
        org,
        rule: "dora_nis2_coordination_missing",
        title: `NIS2 Art. 1(5): orgul e în sector financiar dar nu a declarat DORA`,
        detail:
          "Organizația operează în sector banking / financial_markets, dar profilul regulator NU declară DORA aplicabil. Art. 1(5) NIS2 stipulează că entitățile financiare urmează primar DORA pentru gestiunea riscurilor ICT. Verifică dacă orgul intră în scope DORA (instituție de credit / PSP / investment firm).",
        severity: "medium",
        legalReference: "Directiva (UE) 2022/2555 (NIS2) Art. 1(5) + Reg (UE) 2022/2554 (DORA) Art. 2",
        remediationHint:
          "Actualizează OrgRegulatoryProfile: setează doraApplies=true dacă orgul corespunde unei DoraEntityType. Coordonează doc-urile NIS2 ↔ DORA (overlap controlat).",
        evidenceRequired:
          "OrgRegulatoryProfile actualizat + notă scrisă de coordonare NIS2/DORA în orgRegulatoryProfile.notes.",
        nowISO,
      }),
    )
  }

  return {
    inScope: true,
    gaps,
    findings,
    aggregatedSeverity,
  }
}
