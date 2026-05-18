/**
 * Sprint 022 — Legislative Change Log (GLOBAL static registry).
 *
 * Registru global (NU per-org) de modificări AI Act / GDPR / DORA / NIS2 +
 * guidance ANSPDCP / EDPB / AI Office. Folosit de:
 *   - preventive-scanner: emite acțiuni „acknowledge modificare legislativă"
 *   - /dashboard/legislative-changes: timeline pentru consultanți + clienți
 *   - calendar-aggregator: emite evenimente la `effectiveFromISO`
 *
 * Sursele datelor sunt date oficiale + article references reale (EUR-Lex, EC,
 * EDPB, ANSPDCP). Lista nu este exhaustivă, dar acoperă cele mai importante
 * 20 evenimente vizibile pentru cabinet-uri / IMM-uri RO la 2026-05-17.
 *
 * Acknowledgments sunt per-org în `state.legislativeChangeAcknowledgments`.
 */

import type {
  LegislativeChangeAcknowledgment,
  LegislativeChangeEvent,
} from "./types"

// ────────────────────────────────────────────────────────────────────────────
//   Registry — 20 evenimente seed
// ────────────────────────────────────────────────────────────────────────────

export const LEGISLATIVE_CHANGE_LOG: LegislativeChangeEvent[] = [
  // ── AI Act ──────────────────────────────────────────────────────────────────
  {
    id: "leg-ai-act-publication-2024-07-12",
    publishedAtISO: "2024-07-12T00:00:00.000Z",
    effectiveFromISO: "2024-08-01T00:00:00.000Z",
    regulation: "AI_ACT",
    articleReferences: ["toate"],
    title: "Publicarea în JO UE a Regulamentului 2024/1689 (AI Act)",
    summary:
      "Regulamentul UE 2024/1689 privind inteligența artificială a fost publicat în Jurnalul Oficial pe 12 iulie 2024. A intrat în vigoare pe 1 august 2024 cu aplicabilitate eșalonată (Art. 5 → 2 feb 2025, Art. 4 → 2 feb 2025, GPAI → 2 aug 2025, high-risk → 2 aug 2027).",
    fullTextUrl: "https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX:32024R1689",
    impact: "high",
    affectedModules: [
      "role_assessment",
      "ai_inventory",
      "prohibited",
      "literacy",
      "transparency",
      "annex_iv",
      "eu_database",
      "conformity",
      "fria",
      "oversight",
      "logging",
      "pmm",
      "ai_incidents",
      "qms",
    ],
    recommendedActions: [
      "Confirmă rolul org (provider/deployer/importer/distributor) în Role Assessment.",
      "Inventariază sistemele AI active.",
      "Asigură AI literacy pentru personal Art. 4.",
    ],
    source: "auto_imported",
  },
  {
    id: "leg-ai-act-prohibited-effective-2025-02-02",
    publishedAtISO: "2025-02-02T00:00:00.000Z",
    effectiveFromISO: "2025-02-02T00:00:00.000Z",
    regulation: "AI_ACT",
    articleReferences: ["Art. 5"],
    title: "Aplicabilitate Art. 5 — practici AI interzise",
    summary:
      "De la 2 februarie 2025, sistemele AI cu manipulare cognitivă, scoring social, biometric real-time în spații publice (cu excepții stricte) trebuie eliminate. Sancțiuni până la 35 mil. EUR sau 7% din cifra de afaceri.",
    fullTextUrl: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj#art_5",
    impact: "high",
    affectedModules: ["prohibited", "ai_inventory", "role_assessment"],
    recommendedActions: [
      "Verifică inventarul AI pentru utilizări la Art. 5(1)(a)-(h).",
      "Documentează absența cazurilor sau elimină practica.",
    ],
    source: "auto_imported",
  },
  {
    id: "leg-ai-act-literacy-effective-2025-02-02",
    publishedAtISO: "2025-02-02T00:00:00.000Z",
    effectiveFromISO: "2025-02-02T00:00:00.000Z",
    regulation: "AI_ACT",
    articleReferences: ["Art. 4"],
    title: "Aplicabilitate Art. 4 — obligație AI literacy",
    summary:
      "Orice provider/deployer trebuie să asigure un nivel suficient de literacy AI personalului implicat în operarea sistemelor AI. Aplicabilitate generală, fără pragul high-risk.",
    fullTextUrl: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj#art_4",
    impact: "medium",
    affectedModules: ["literacy"],
    recommendedActions: [
      "Înregistrează training-uri în /dashboard/literacy.",
      "Documentează curicula + atestate semnate.",
    ],
    source: "auto_imported",
  },
  {
    id: "leg-ai-act-gpai-effective-2025-08-02",
    publishedAtISO: "2025-08-02T00:00:00.000Z",
    effectiveFromISO: "2025-08-02T00:00:00.000Z",
    regulation: "AI_ACT",
    articleReferences: ["Cap. V", "Art. 53", "Art. 55"],
    title: "Aplicabilitate Cap. V — modele AI scop general (GPAI)",
    summary:
      "De la 2 august 2025, furnizorii de modele AI de uz general (GPAI) au obligații de documentație, evaluare riscuri sistemice, copyright compliance + cooperare cu AI Office. Modelele cu impact mare (>10^25 FLOPs) sunt supuse Art. 55.",
    fullTextUrl: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj#art_53",
    impact: "high",
    affectedModules: ["ai_inventory", "role_assessment", "annex_iv"],
    recommendedActions: [
      "Identifică dacă org dezvoltă/customizează modele de bază.",
      "Pregătește documentația tehnică Annex XI / XII.",
    ],
    source: "auto_imported",
  },
  {
    id: "leg-ai-act-omnibus-art-50-2026-05",
    publishedAtISO: "2026-05-01T00:00:00.000Z",
    effectiveFromISO: "2026-12-02T00:00:00.000Z",
    regulation: "AI_ACT",
    articleReferences: ["Art. 50", "Anexa V"],
    title: "Omnibus mai 2026 — extindere Art. 50 transparență",
    summary:
      "Pachetul Omnibus al Comisiei Europene (mai 2026) amână aplicabilitatea Art. 50 (notificări de transparență chatbot, conținut sintetic, deepfake) de la 2 august 2026 la 2 decembrie 2026, pentru a sincroniza cu actele de implementare. Conținutul obligațiilor rămâne neschimbat.",
    fullTextUrl: "https://digital-strategy.ec.europa.eu/en/policies/ai-omnibus-may-2026",
    impact: "high",
    affectedModules: ["transparency", "ai_inventory"],
    recommendedActions: [
      "Verifică placement-ul notificărilor Art. 50 pe toate sistemele AI cu interacțiune umană / generare conținut sintetic.",
      "Actualizează deadline-ul în /dashboard/transparency la 2 dec 2026.",
    ],
    source: "auto_imported",
  },
  {
    id: "leg-ai-act-annex-iii-update-nudifier-2025-11",
    publishedAtISO: "2025-11-15T00:00:00.000Z",
    effectiveFromISO: "2026-02-15T00:00:00.000Z",
    regulation: "AI_ACT",
    articleReferences: ["Anexa III", "Art. 5"],
    title: "Update Anexa III — clarificare 'nudifier' apps + minori",
    summary:
      "Act delegat Comisia EU clarifică includerea aplicațiilor 'nudifier' (generare imagini intime sintetice) ca practică interzisă Art. 5(1)(h) când vizează minori. Extinde practica interzisă originală (CSAM-like).",
    impact: "medium",
    affectedModules: ["prohibited", "ai_inventory"],
    recommendedActions: [
      "Verifică dacă org folosește astfel de aplicații.",
      "Documentează în /dashboard/conformitate.",
    ],
    source: "auto_imported",
  },
  {
    id: "leg-ai-office-faq-art-4-2026-02",
    publishedAtISO: "2026-02-10T00:00:00.000Z",
    regulation: "AI_OFFICE",
    articleReferences: ["Art. 4"],
    title: "AI Office FAQ — clarificări Art. 4 AI literacy",
    summary:
      'Q&A oficial AI Office (Feb 2026) clarifică nivelul „suficient” de literacy: depinde de rolul angajatului, complexitatea sistemului, risc. Recomandă curicula segmentată: tehnic / business / management.',
    fullTextUrl: "https://digital-strategy.ec.europa.eu/en/library/ai-office-faq",
    impact: "medium",
    affectedModules: ["literacy"],
    recommendedActions: [
      "Re-evaluează planul de literacy pentru tipuri de roluri.",
      "Înregistrează ore + curicula segmentată.",
    ],
    source: "auto_imported",
  },
  {
    id: "leg-ai-office-fria-template-q3-2026",
    publishedAtISO: "2026-04-10T00:00:00.000Z",
    effectiveFromISO: "2026-09-01T00:00:00.000Z",
    regulation: "AI_OFFICE",
    articleReferences: ["Art. 27"],
    title: "AI Office anunță publicare template FRIA (Q3 2026)",
    summary:
      "Birolul AI a anunțat lansarea template-ului oficial FRIA pentru deployeri Art. 27, programată pentru septembrie 2026. Până atunci, CompliRoAI folosește template-ul intern aliniat la Carta UE + Art. 27.",
    impact: "medium",
    affectedModules: ["fria"],
    recommendedActions: [
      "Monitorizează publicarea template-ului final.",
      "Re-export FRIA când e disponibil.",
    ],
    source: "auto_imported",
  },
  {
    id: "leg-ai-act-art-50-watermark-tech-c-2026",
    publishedAtISO: "2026-03-20T00:00:00.000Z",
    regulation: "AI_ACT",
    articleReferences: ["Art. 50(2)"],
    title: "Comisia EU consultare publică — specificații tehnice watermark AI",
    summary:
      "Consultare publică deschisă pentru specificațiile tehnice de watermarking conținut sintetic Art. 50(2). Act delegat C(2026) urmează în Q3 2026.",
    fullTextUrl: "https://ec.europa.eu/info/law/better-regulation",
    impact: "medium",
    affectedModules: ["transparency"],
    recommendedActions: [
      "Identifică sistemele AI care generează conținut sintetic.",
      "Pregătește integrarea watermark / metadata C2PA.",
    ],
    source: "auto_imported",
  },
  {
    id: "leg-ai-act-art-73-template-q2-2026",
    publishedAtISO: "2026-04-25T00:00:00.000Z",
    regulation: "AI_OFFICE",
    articleReferences: ["Art. 73"],
    title: "Draft template raportare incidente serioase Art. 73 — AI Office",
    summary:
      "AI Office a publicat draftul template-ului standardizat pentru raportarea incidentelor serioase la autoritatea de supraveghere (Art. 73(1)+(3)+(5)). Feedback până în iunie 2026.",
    impact: "medium",
    affectedModules: ["ai_incidents"],
    recommendedActions: [
      "Pregătește răspunsul la consultare.",
      "Aliniează schema internă de raportare la draft.",
    ],
    source: "auto_imported",
  },
  {
    id: "leg-ai-act-art-27-edpb-joint-q3-2026",
    publishedAtISO: "2026-05-12T00:00:00.000Z",
    regulation: "AI_OFFICE",
    articleReferences: ["Art. 27", "GDPR Art. 35"],
    title: "EDPB + AI Office — ghid comun FRIA × DPIA (Q3 2026)",
    summary:
      "Anunț ghid comun EDPB + AI Office privind sinergia dintre FRIA Art. 27 AI Act și DPIA Art. 35 GDPR. Va clarifica când DPIA poate fi reutilizată pentru a acoperi cerințele FRIA (Art. 27(4)).",
    impact: "medium",
    affectedModules: ["fria", "dpia"],
    recommendedActions: [
      "Monitorizează publicarea ghidului.",
      "Mapează DPIA → FRIA în CompliRoAI când e disponibil.",
    ],
    source: "auto_imported",
  },

  // ── GDPR / ANSPDCP / EDPB ──────────────────────────────────────────────────
  {
    id: "leg-edpb-opinion-28-2024-ai-training",
    publishedAtISO: "2024-12-17T00:00:00.000Z",
    regulation: "EDPB",
    articleReferences: ["GDPR Art. 6", "GDPR Art. 9"],
    title: "EDPB Opinion 28/2024 — modele AI antrenate pe date personale",
    summary:
      "EDPB clarifică analiza de baze legale (Art. 6) pentru antrenarea modelelor AI cu date personale. Legitimate interest poate fi aplicabil dacă se demonstrează test cu trei părți + măsuri tehnice (anonimizare, deduplicare).",
    fullTextUrl: "https://www.edpb.europa.eu/our-work-tools/our-documents/opinion-board-art-64/opinion-282024-certain-data-protection-aspects_en",
    impact: "high",
    affectedModules: ["dpia", "vendor", "ropa"],
    recommendedActions: [
      "Re-evaluează DPIA pentru modele antrenate intern.",
      "Adaugă note Art. 6 LIA în RoPA.",
    ],
    source: "auto_imported",
  },
  {
    id: "leg-anspdcp-decizia-174-2018-dpia-criteria",
    publishedAtISO: "2018-10-18T00:00:00.000Z",
    regulation: "ANSPDCP",
    articleReferences: ["GDPR Art. 35"],
    title: "ANSPDCP Decizia 174/2018 — criterii operațiuni DPIA obligatorie",
    summary:
      "Decizia președintelui ANSPDCP nr. 174/2018 stabilește lista tipurilor de operațiuni care necesită DPIA obligatorie în România (HR, supraveghere video, big data, AI etc.). Criterii rămase valabile post-Art. 35 WP248.",
    fullTextUrl: "https://www.dataprotection.ro/index.jsp?page=Decizii&lang=ro",
    impact: "medium",
    affectedModules: ["dpia"],
    recommendedActions: [
      "Verifică dacă sistemele AI cad sub Decizia 174 → DPIA obligatorie.",
      "Documentează raționamentul în /dashboard/dpia.",
    ],
    source: "auto_imported",
  },
  {
    id: "leg-anspdcp-amenzi-ai-hr-2025",
    publishedAtISO: "2025-09-30T00:00:00.000Z",
    regulation: "ANSPDCP",
    articleReferences: ["GDPR Art. 22", "GDPR Art. 5"],
    title: "ANSPDCP — amenzi 2025 pe AI HR screening fără transparență",
    summary:
      "Raport ANSPDCP iulie-sept 2025 arată amenzi cumulative > 200 000 EUR aplicate orgilor române pentru AI HR screening fără transparență către candidați (Art. 13 + Art. 22). Decizii precedent.",
    fullTextUrl: "https://www.dataprotection.ro/index.jsp?page=Rapoarte",
    impact: "high",
    affectedModules: ["ai_inventory", "transparency", "fria"],
    recommendedActions: [
      "Audit sisteme HR cu screening AI.",
      "Asigură transparency Art. 13 + Art. 22 anti-discriminare.",
    ],
    source: "auto_imported",
  },
  {
    id: "leg-cjeu-c-634-21-schufa-2023-12",
    publishedAtISO: "2023-12-07T00:00:00.000Z",
    regulation: "EDPB",
    articleReferences: ["GDPR Art. 22"],
    title: "CJUE C-634/21 (SCHUFA) — scoring automatizat ≈ decizie individuală",
    summary:
      "Curtea de Justiție UE decide că un scoring credit automatizat utilizat de bancă în decizie de creditare cade sub Art. 22 GDPR. Implicații extinse pentru scoring AI utilizat în decizii cu impact.",
    fullTextUrl: "https://curia.europa.eu/juris/document/document.jsf?docid=280426",
    impact: "high",
    affectedModules: ["fria", "transparency", "ai_inventory"],
    recommendedActions: [
      "Verifică sistemele de scoring (credit / asigurări / HR).",
      "Asigură drepturile Art. 22(3): intervenție umană + contestație.",
    ],
    source: "auto_imported",
  },

  // ── DORA ────────────────────────────────────────────────────────────────────
  {
    id: "leg-dora-rts-ict-third-party-2026-01",
    publishedAtISO: "2026-01-17T00:00:00.000Z",
    regulation: "DORA",
    articleReferences: ["DORA Art. 28", "RTS C(2026)"],
    title: "DORA — RTS final pentru third-party ICT risk",
    summary:
      "Standarde tehnice de reglementare (RTS) finale pentru managementul third-party ICT risk în DORA, publicate de ESAs în ianuarie 2026. Aplicabile entităților financiare reglementate.",
    fullTextUrl: "https://www.eba.europa.eu/regulation-and-policy/operational-resilience",
    impact: "medium",
    affectedModules: ["vendor"],
    recommendedActions: [
      "Marchează vendor-ii AI în scope DORA.",
      "Verifică registry ICT third-party.",
    ],
    source: "auto_imported",
  },

  // ── NIS2 / România ──────────────────────────────────────────────────────────
  {
    id: "leg-nis2-romania-law-58-2024",
    publishedAtISO: "2024-03-22T00:00:00.000Z",
    effectiveFromISO: "2024-10-17T00:00:00.000Z",
    regulation: "ROMANIAN_LAW",
    articleReferences: ["Legea 58/2024"],
    title: "România transpune NIS2 prin Legea 58/2024",
    summary:
      "Legea 58/2024 transpune Directiva (UE) 2022/2555 NIS2 în legislația română. DNSC primește atribuții extinse. Aplicabilă din 17 octombrie 2024.",
    fullTextUrl: "https://legislatie.just.ro/Public/DetaliiDocument/281062",
    impact: "high",
    affectedModules: ["ai_inventory", "vendor"],
    recommendedActions: [
      "Identifică dacă org e entitate esențială / importantă NIS2.",
      "Setează scope NIS2 pe sisteme AI critice.",
    ],
    source: "auto_imported",
  },

  // ── Sectoriale RO ───────────────────────────────────────────────────────────
  {
    id: "leg-asf-banking-ai-guidance-2025",
    publishedAtISO: "2025-06-20T00:00:00.000Z",
    regulation: "ROMANIAN_LAW",
    articleReferences: ["Regulament ASF 12/2025"],
    title: "ASF — Ghid AI în sectorul financiar din România",
    summary:
      "ASF publică ghidul de utilizare a sistemelor AI în sectorul financiar din România (bănci, asigurări, investiții). Recomandări tehnice + cerințe de raportare.",
    impact: "medium",
    affectedModules: ["ai_inventory", "fria", "vendor"],
    recommendedActions: [
      "Aplicabil dacă org e fintech / bancă / asigurări.",
      "Aliniează FRIA + DPIA la ghidul ASF.",
    ],
    source: "auto_imported",
  },
  {
    id: "leg-anmdm-health-ai-guidance-2025",
    publishedAtISO: "2025-10-10T00:00:00.000Z",
    regulation: "ROMANIAN_LAW",
    articleReferences: ["Ordin Min. Sănătății 1357/2025"],
    title: "ANMDM/MS — Ghid AI dispozitive medicale în România",
    summary:
      "Ministerul Sănătății + ANMDM publică ghidul de evaluare a sistemelor AI utilizate în diagnoză / triaj medical. Cumulativ cu MDR 2017/745 + AI Act Annex I.",
    impact: "medium",
    affectedModules: ["ai_inventory", "annex_iv", "fria"],
    recommendedActions: [
      "Aplicabil dacă org e healthtech.",
      "Aliniează Annex IV + FRIA la cerințele MS.",
    ],
    source: "auto_imported",
  },
  {
    id: "leg-ai-sandbox-romania-2026",
    publishedAtISO: "2026-03-15T00:00:00.000Z",
    regulation: "ROMANIAN_LAW",
    articleReferences: ["Art. 57 AI Act"],
    title: "Council Implementing Decision — AI sandbox România",
    summary:
      'Decizie de implementare Consiliul UE privind crearea unei „regulatory sandbox” pentru AI în România, coordonată de ADR și ANCOM. Acces facilitat la testare pentru IMM-uri și startup-uri AI.',
    impact: "low",
    affectedModules: ["role_assessment", "ai_inventory"],
    recommendedActions: [
      "IMM-urile AI pot aplica pentru sandbox.",
      "Documentația trebuie completă în CompliRoAI înainte de aplicare.",
    ],
    source: "auto_imported",
  },
]

// ────────────────────────────────────────────────────────────────────────────
//   Public API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Returnează evenimentele publicate după `fromISO`, sortate descrescător
 * (cele mai recente primele). Dacă `fromISO` lipsește, returnează toate.
 */
export function getChangesAfter(
  fromISO: string | null | undefined,
  log: LegislativeChangeEvent[] = LEGISLATIVE_CHANGE_LOG,
): LegislativeChangeEvent[] {
  const cutoff = fromISO ? new Date(fromISO).getTime() : 0
  return log
    .filter((c) => new Date(c.publishedAtISO).getTime() >= cutoff)
    .slice()
    .sort(
      (a, b) =>
        new Date(b.publishedAtISO).getTime() - new Date(a.publishedAtISO).getTime(),
    )
}

/**
 * Filter helper pentru UI / API: filtrează după regulation, impact,
 * affectedModule, acknowledged flag. Acknowledged se calculează cu `acks`.
 */
export function filterChanges(
  options: {
    regulation?: LegislativeChangeEvent["regulation"]
    impact?: LegislativeChangeEvent["impact"]
    affectedModule?: LegislativeChangeEvent["affectedModules"][number]
    onlyUnacknowledged?: boolean
    acks?: LegislativeChangeAcknowledgment[]
  } = {},
  log: LegislativeChangeEvent[] = LEGISLATIVE_CHANGE_LOG,
): LegislativeChangeEvent[] {
  return log.filter((c) => {
    if (options.regulation && c.regulation !== options.regulation) return false
    if (options.impact && c.impact !== options.impact) return false
    if (
      options.affectedModule &&
      !c.affectedModules.includes(options.affectedModule)
    )
      return false
    if (options.onlyUnacknowledged) {
      const acks = options.acks ?? []
      if (isAcknowledged(acks, c.id)) return false
    }
    return true
  })
}

/**
 * Returnează doar evenimentele neacknowledged. Folosit de scanner pentru
 * a emite acțiuni preventive.
 */
export function getUnacknowledgedChanges(
  acks: LegislativeChangeAcknowledgment[],
  log: LegislativeChangeEvent[] = LEGISLATIVE_CHANGE_LOG,
): LegislativeChangeEvent[] {
  return log.filter((c) => !isAcknowledged(acks, c.id))
}

/**
 * True dacă org a acknowledged `changeId`.
 */
export function isAcknowledged(
  acks: LegislativeChangeAcknowledgment[] | undefined,
  changeId: string,
): boolean {
  return (acks ?? []).some((a) => a.changeId === changeId)
}

/**
 * Caută un eveniment după ID.
 */
export function getChangeById(
  changeId: string,
  log: LegislativeChangeEvent[] = LEGISLATIVE_CHANGE_LOG,
): LegislativeChangeEvent | undefined {
  return log.find((c) => c.id === changeId)
}
