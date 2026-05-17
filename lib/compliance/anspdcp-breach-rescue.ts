/**
 * Sprint 008D — ANSPDCP Breach Notification Rescue Finding
 *
 * Port verbatim din DPO-OS v3-unified (`lib/compliance/anspdcp-breach-rescue.ts`),
 * cu o singura adaptare: importul `AnspdcpNotificationStatus` provine din
 * `@/lib/compliance/types` (BreachRecord shape), NU din nis2-store (forbidden
 * per mandat § 9 Rule 3 — NIS2 surface interzis in CompliRoAI 008D).
 *
 * Cand un breach GDPR (sau, viitor in Sprint 012, un incident NIS2 AI-critical
 * cu date personale) este creat, breach-store apeleaza `buildAnspdcpBreachFinding`
 * si emite finding-ul rescue in /dashboard/resolve cu deadline 72h calculat.
 *
 * Identificare stabila a finding-urilor rescue:
 *  - `anspdcpFindingId(breachId)` produce id deterministic
 *  - `getIncidentIdFromAnspdcpFindingId(findingId)` reverseaza (pentru navigare)
 *  - dedupe in findings-store: nu re-emite daca id-ul stable exista deja
 */

import type { AnspdcpNotificationStatus, ScanFinding } from "@/lib/compliance/types"

export const ANSPDCP_FINDING_PREFIX = "anspdcp-breach-"

export function anspdcpFindingId(incidentId: string): string {
  return `${ANSPDCP_FINDING_PREFIX}${incidentId}`
}

export function getIncidentIdFromAnspdcpFindingId(findingId: string): string | null {
  if (!findingId.startsWith(ANSPDCP_FINDING_PREFIX)) return null
  const incidentId = findingId.slice(ANSPDCP_FINDING_PREFIX.length).trim()
  return incidentId.length > 0 ? incidentId : null
}

/**
 * Construieste finding-ul de urgenta ANSPDCP pentru un breach / incident cu
 * date personale. Returneaza null daca notificarea ANSPDCP a fost deja
 * trimisa (`submitted`) sau confirmata (`acknowledged`) — nu mai e nevoie de
 * rescue. Severitatea este:
 *  - `critical` daca termenul de 72h e depasit
 *  - `high` daca mai sunt <=24h (urgent) sau in restul perioadei
 */
export function buildAnspdcpBreachFinding(
  incidentId: string,
  incidentTitle: string,
  detectedAtISO: string,
  anspdcpStatus: AnspdcpNotificationStatus | undefined,
  nowISO: string,
): ScanFinding | null {
  if (anspdcpStatus === "submitted" || anspdcpStatus === "acknowledged") return null

  const deadline72h = new Date(new Date(detectedAtISO).getTime() + 72 * 3_600_000)
  const hoursLeft = Math.round((deadline72h.getTime() - new Date(nowISO).getTime()) / 3_600_000)
  const expired = hoursLeft <= 0
  const urgent = !expired && hoursLeft <= 24
  const severity: ScanFinding["severity"] = expired ? "critical" : urgent ? "high" : "high"

  const deadlineLabel = expired
    ? `Termenul de 72h a expirat cu ${Math.abs(hoursLeft)}h in urma`
    : `${hoursLeft}h ramase din 72h`

  return {
    id: anspdcpFindingId(incidentId),
    title: `Notificare ANSPDCP obligatorie — ${incidentTitle}`,
    detail: [
      `Breach-ul GDPR "${incidentTitle}" implica date cu caracter personal.`,
      `GDPR Art. 33 impune notificarea ANSPDCP in **72h de la descoperire**. ${deadlineLabel}.`,
      "",
      "Continut obligatoriu (GDPR Art. 33(3)):",
      "• Natura incalcarii + categorii de date afectate",
      "• Numar aproximativ de persoane vizate",
      "• Date de contact DPO / responsabil conformitate",
      "• Consecinte probabile ale incalcarii",
      "• Masuri luate sau propuse",
    ].join("\n"),
    category: "GDPR",
    severity,
    risk: "high",
    principles: ["accountability", "transparency"],
    createdAtISO: nowISO,
    sourceDocument: "Breach GDPR cu date personale",
    legalReference: "GDPR Art. 33 — notificare autoritate de supraveghere in 72h",
    impactSummary:
      "Nenotificarea ANSPDCP in 72h atrage amenzi GDPR de pana la 10M€ sau 2% din cifra de afaceri globala.",
    remediationHint: `Completeaza formularul de notificare ANSPDCP din panoul breach → sectiunea "Notificare ANSPDCP — GDPR Art. 33".`,
    readyTextLabel: "Notificare trimisa la ANSPDCP",
    readyText: `Am notificat ANSPDCP conform GDPR Art. 33 pentru breach-ul "${incidentTitle}". Nr. de inregistrare primit si arhivat.`,
  }
}
