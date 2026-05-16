// AI Act Role Classifier — CompliRoAI Sprint 5.5
//
// Răspuns la întrebarea juridică #1 din EU AI Act:
// "Cine sunt eu — provider, deployer, importer, distributor, manufacturer?"
//
// Logica derivă din:
//   - Art. 2 (scope și excluderi)
//   - Art. 3 (definiții formale ale rolurilor)
//   - Art. 16-22 (obligații provider)
//   - Art. 23 (importer), Art. 24 (distributor), Art. 25 (rep. autorizat + manufacturer)
//   - Art. 26-27 (obligații deployer + FRIA)
//
// Funcția `classifyAIActRole` e pură (input/output deterministic) — niciun side effect,
// niciun acces la DB sau filesystem. Persistarea se face de API route.

import type {
  AIActRole,
  RoleAssessment,
  RoleAssessmentAnswers,
} from "./types"

// ────────────────────────────────────────────────────────────────────────────
//   Articole aplicabile per rol
// ────────────────────────────────────────────────────────────────────────────

const ARTICLES_BY_ROLE: Record<AIActRole, string[]> = {
  provider: [
    "Art. 16-22 (obligații generale provider)",
    "Art. 11 + Annex IV (documentație tehnică HRAIS)",
    "Art. 43 (evaluare conformitate)",
    "Art. 49 (înregistrare EU Database)",
    "Art. 72 (monitorizare post-market)",
    "Art. 73 (raportare incidente)",
  ],
  deployer: [
    "Art. 26 (obligații deployer)",
    "Art. 27 (FRIA — Fundamental Rights Impact Assessment, dacă HRAIS)",
    "Art. 14 (supraveghere umană)",
    "Art. 4 (AI Literacy)",
  ],
  importer: [
    "Art. 23 (obligații importer)",
    "Art. 25 (reprezentant autorizat al provider-ului non-EU)",
    "Art. 11 verificare documentație tehnică",
  ],
  distributor: ["Art. 24 (obligații distributor)"],
  manufacturer: [
    "Art. 25 + Annex I (producător de produse cu AI integrat)",
    "Obligații duale provider + manufacturer pentru AI safety components",
  ],
  mixed: ["Combinație — vezi rolurile secundare pentru lista completă"],
  exempt: ["Art. 2 — exclus din domeniul de aplicare"],
}

// ────────────────────────────────────────────────────────────────────────────
//   Public API
// ────────────────────────────────────────────────────────────────────────────

export type ClassifyResult = Omit<
  RoleAssessment,
  "id" | "answeredAtISO" | "answeredByEmail" | "answers"
>

export function classifyAIActRole(answers: RoleAssessmentAnswers): ClassifyResult {
  // ──────────────────────────────────────────────────────────────────────────
  // Verificări out-of-scope (Art. 2)
  // ──────────────────────────────────────────────────────────────────────────

  if (answers.personalNonCommercialUseOnly === "yes") {
    return {
      primaryRole: "exempt",
      secondaryRoles: [],
      reasoning:
        "Folosire pur personală, non-comercială — exclus din domeniul de aplicare conform Art. 2(10). " +
        "AI Act nu se aplică persoanelor fizice ce folosesc sisteme AI pentru activități non-profesionale.",
      applicableArticles: [],
      scopeExceptions: ["Art. 2(10) — uz personal non-profesional"],
    }
  }

  if (answers.militaryOrResearchOnly === "yes") {
    return {
      primaryRole: "exempt",
      secondaryRoles: [],
      reasoning:
        "Sistem destinat exclusiv scopurilor militare/apărare/securitate națională sau pur cercetării " +
        "științifice — exceptat conform Art. 2(3) și Art. 2(6). Atenție: dacă sistemul intră ulterior în " +
        "uz comercial sau testare în condiții reale (Art. 2(8)), excepția încetează.",
      applicableArticles: [],
      scopeExceptions: [
        "Art. 2(3) — uz militar/apărare/securitate națională",
        "Art. 2(6) — cercetare științifică pură",
      ],
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Atribuire roluri (ordinea în array determină rolul primar)
  // ──────────────────────────────────────────────────────────────────────────

  const roles: AIActRole[] = []
  const reasons: string[] = []

  // PROVIDER (Art. 3(3)): dezvoltă AI și-l pune pe piață sub propriul nume/marcă.
  if (
    answers.developsAI === "yes" &&
    answers.sellsToThirdParties === "yes"
  ) {
    roles.push("provider")
    reasons.push(
      "Dezvolți sisteme AI și le pui pe piață sub propriul nume → ești PROVIDER (Art. 3(3))."
    )
  } else if (
    answers.developsAI === "yes" &&
    answers.usesAIInternally === "yes"
  ) {
    // Dezvoltare pentru uz intern → tot provider, dar pentru propria organizație.
    roles.push("provider")
    reasons.push(
      "Dezvolți sisteme AI pe care le folosești intern — chiar fără a le vinde, ești considerat PROVIDER " +
        "pentru obligațiile de dezvoltare (Art. 3(3) coroborat cu Art. 16)."
    )
  }

  // DEPLOYER (Art. 3(4)): folosește AI dezvoltat de altul în activitatea profesională.
  if (answers.usesAIInternally === "yes" && answers.developsAI !== "yes") {
    roles.push("deployer")
    reasons.push(
      "Folosești sisteme AI dezvoltate de alții în activitatea ta operațională → ești DEPLOYER " +
        "(Art. 3(4))."
    )
  } else if (
    answers.usesAIInternally === "yes" &&
    answers.developsAI === "yes"
  ) {
    // Și provider și deployer pentru propriul sistem.
    if (!roles.includes("deployer")) {
      roles.push("deployer")
    }
    reasons.push(
      "Folosești și sistemele AI proprii în activitate → ești și DEPLOYER pe lângă PROVIDER " +
        "(dublu rol — obligațiile se cumulează)."
    )
  }

  // IMPORTER (Art. 23): aduce pe piața UE sisteme AI de la furnizori non-EU.
  if (answers.importsFromNonEU === "yes") {
    roles.push("importer")
    reasons.push(
      "Importi sisteme AI de la furnizori non-EU pentru piața UE → ești IMPORTER (Art. 23). " +
        "Trebuie să verifici că provider-ul a îndeplinit conformity assessment și să-ți menții " +
        "registrul de importuri."
    )
  }

  // DISTRIBUTOR (Art. 24): pune la dispoziție pe piață sisteme AI ale terților, fără a fi importer.
  if (
    answers.distributesThirdPartyAI === "yes" &&
    answers.importsFromNonEU !== "yes"
  ) {
    roles.push("distributor")
    reasons.push(
      "Distribui (revinzi) sisteme AI ale altor companii pe piața UE fără a fi importer → ești " +
        "DISTRIBUTOR (Art. 24)."
    )
  }

  // PRODUCT MANUFACTURER (Art. 25 + Annex I): integrează AI ca safety component în produse.
  if (answers.embedsAIInPhysicalProducts === "yes") {
    roles.push("manufacturer")
    reasons.push(
      "Integrezi AI ca safety component în produse fizice (Annex I) → ești PRODUCT MANUFACTURER " +
        "cu obligații duale provider + manufacturer (Art. 25). Conformitatea AI Act se aliniază " +
        "cu legislația sectorială (Machinery, MDR, automotive etc.)."
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Default — niciun rol identificat
  // ──────────────────────────────────────────────────────────────────────────

  if (roles.length === 0) {
    return {
      primaryRole: "exempt",
      secondaryRoles: [],
      reasoning:
        "Răspunsurile date nu indică niciun rol specific AI Act. Posibil: nu interacționezi cu " +
        "sisteme AI în activitatea profesională, sau răspunsurile sunt incomplete (multe 'unsure'). " +
        "Recomandare: re-evaluează manual sau consultă un specialist juridic.",
      applicableArticles: [],
      scopeExceptions: ["Necesită evaluare manuală"],
    }
  }

  const primary = roles[0]
  const secondary = roles.slice(1)
  const isMixed = secondary.length > 0

  // Articolele aplicabile = uniunea articolelor pentru toate rolurile identificate.
  const applicableArticles = Array.from(
    new Set([
      ...ARTICLES_BY_ROLE[primary],
      ...secondary.flatMap((r) => ARTICLES_BY_ROLE[r]),
    ])
  )

  return {
    primaryRole: isMixed ? "mixed" : primary,
    secondaryRoles: isMixed ? roles : [],
    reasoning: reasons.join(" "),
    applicableArticles,
    scopeExceptions: [],
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Labels pentru UI / templates
// ────────────────────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<AIActRole, string> = {
  provider: "Provider (furnizor)",
  deployer: "Deployer (utilizator profesional)",
  importer: "Importer (importator)",
  distributor: "Distributor (distribuitor)",
  manufacturer: "Product Manufacturer (producător de produse cu AI)",
  mixed: "Mixt (mai multe roluri simultan)",
  exempt: "Exceptat (out of scope)",
}

export const ROLE_LABELS_SHORT: Record<AIActRole, string> = {
  provider: "Provider",
  deployer: "Deployer",
  importer: "Importer",
  distributor: "Distributor",
  manufacturer: "Manufacturer",
  mixed: "Mixt",
  exempt: "Exceptat",
}

/**
 * Top 3 acțiuni imediate per rol, pentru memo-ul de Role Assessment.
 */
export function getImmediateNextSteps(role: AIActRole): string[] {
  switch (role) {
    case "provider":
      return [
        "Inventariază toate sistemele AI dezvoltate și clasifică-le (Art. 5 / HRAIS / limited / minimal).",
        "Pregătește Annex IV (documentație tehnică) și planul de conformity assessment (Art. 11, Art. 43).",
        "Înregistrează sistemele HRAIS în EU Database (Art. 49) și activează monitoring post-market (Art. 72).",
      ]
    case "deployer":
      return [
        "Pornește programul de AI Literacy (Art. 4) — obligatoriu din 2 februarie 2025.",
        "Pentru fiecare HRAIS folosit, pregătește FRIA (Art. 27) și documentează human oversight (Art. 14).",
        "Stabilește un proces intern de notificare a provider-ului în caz de risc / incident (Art. 26(5)).",
      ]
    case "importer":
      return [
        "Verifică pentru fiecare import: declarație de conformitate UE + Annex IV + marcaj CE.",
        "Stabilește reprezentant autorizat (Art. 25) dacă provider-ul nu are sediu în UE.",
        "Menține registrul importurilor + canale de comunicare cu autoritățile de supraveghere.",
      ]
    case "distributor":
      return [
        "Verifică prezența marcajului CE și a declarației de conformitate înainte de a pune sistemul pe piață.",
        "Asigură-te că documentația de utilizare însoțește produsul în limba țării de destinație.",
        "Suspendă distribuția dacă identifici o neconformitate și informează importer-ul / provider-ul.",
      ]
    case "manufacturer":
      return [
        "Identifică în Annex I sectorul de produs aplicabil și aliniază conformitatea AI Act la cadrul sectorial.",
        "Acumulează în paralel obligațiile provider (Annex IV, Art. 43) și obligațiile de produs (Machinery, MDR etc.).",
        "Coordonează notified body pentru evaluare de produs cu AI component.",
      ]
    case "mixed":
      return [
        "Listează separat obligațiile pentru fiecare rol identificat și unifică-le într-un singur plan.",
        "Numește un AI Compliance Officer responsabil de coordonare cross-rol.",
        "Generează Readiness Pack — fiecare secțiune va include obligațiile cumulate.",
      ]
    case "exempt":
      return [
        "Documentează motivul de exceptare (Art. 2) într-un memo intern.",
        "Re-evaluează trimestrial — dacă scope-ul se schimbă (ex: trece la uz comercial), excepția cade.",
        "Pentru orice extindere a uzului AI, completează din nou Role Assessment.",
      ]
  }
}
