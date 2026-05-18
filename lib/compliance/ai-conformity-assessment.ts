// EU AI Act Conformity Assessment — 10-question workflow → gap analysis + Annex IV generator.
// Each question maps to specific EU AI Act articles and generates remediation actions.

export type AssessmentAnswer = "yes" | "no" | "partial" | "na"

export type AssessmentQuestion = {
  id: string
  text: string
  hint: string
  /** EU AI Act article(s) */
  legalRef: string
  /** Weight in conformity score (0–10) */
  weight: number
  /** If yes = good, or no = good */
  positiveAnswer: "yes" | "no"
  /** What action to take when non-conformant */
  remediationHint: string
  category: "risk_class" | "human_oversight" | "documentation" | "data_governance" | "transparency" | "registration"
}

export const AI_CONFORMITY_QUESTIONS: AssessmentQuestion[] = [
  {
    id: "q1-risk-class",
    text: "Sistemul AI face parte dintr-o categorie de risc ridicat conform Anexei III EU AI Act?",
    hint: "Anexa III include: biometrie, infrastructură critică, educație, angajare, servicii esențiale, aplicarea legii, migrație, administrare justiție.",
    legalRef: "EU AI Act Anexa III + Art. 6",
    weight: 10,
    positiveAnswer: "no",
    remediationHint: "Dacă sistemul face parte din Anexa III, aplică toate cerințele pentru risc ridicat: documentație tehnică, QMS, înregistrare UE, etc.",
    category: "risk_class",
  },
  {
    id: "q2-prohibited",
    text: "Sistemul AI folosește practici interzise (manipulare subliminală, scoruri sociale, identificare biometrică în timp real în spații publice)?",
    hint: "Practicile interzise din Art. 5 includ: manipularea comportamentală exploatativă, sisteme de scoring social de stat, identificare biometrică în timp real în spații publice de către autorități (cu excepții).",
    legalRef: "EU AI Act Art. 5",
    weight: 10,
    positiveAnswer: "no",
    remediationHint: "Practicile interzise duc la amenzi de până la €35M sau 7% din CA. Oprește imediat și consultă un jurist specializat în AI Act.",
    category: "risk_class",
  },
  {
    id: "q3-human-oversight",
    text: "Există supraveghere umană efectivă a deciziilor sistemului AI (human in the loop)?",
    hint: "Un om competent poate opri, corecta sau suprascrie orice decizie a sistemului. Există proceduri documentate pentru intervenție umană.",
    legalRef: "EU AI Act Art. 14",
    weight: 9,
    positiveAnswer: "yes",
    remediationHint: "Implementează un mecanism de override manual, desemnează responsabili, documentează procedura de supraveghere. Instruiește utilizatorii.",
    category: "human_oversight",
  },
  {
    id: "q4-technical-doc",
    text: "Există documentație tehnică completă conform Art. 11 + Anexa IV?",
    hint: "Documentația tehnică (Annexa IV) include: descrierea sistemului, arhitectura, datele de antrenament, metricile de performanță, limitele cunoscute, cerințele hardware.",
    legalRef: "EU AI Act Art. 11 + Anexa IV",
    weight: 8,
    positiveAnswer: "yes",
    remediationHint: "Creează documentația tehnică cu toate elementele din Anexa IV. Aplicația poate genera un template Annex IV cu datele sistemului tău.",
    category: "documentation",
  },
  {
    id: "q5-qms",
    text: "Există un sistem de management al calității (QMS) documentat conform Art. 9?",
    hint: "QMS include: politici de gestionare a riscului, proceduri de testare, responsabilități, înregistrări de conformitate, revizuiri periodice.",
    legalRef: "EU AI Act Art. 9",
    weight: 8,
    positiveAnswer: "yes",
    remediationHint: "Implementează un QMS minim: politică de risc AI, proceduri de testare, log-uri de incidente, revizuire anuală. Documentează totul.",
    category: "documentation",
  },
  {
    id: "q6-data-governance",
    text: "Există politici de guvernanță a datelor de antrenament și testare (calitate, bias, origine)?",
    hint: "Datele folosite pentru antrenament trebuie să fie relevante, reprezentative, fără bias discriminatoriu, cu origine verificabilă.",
    legalRef: "EU AI Act Art. 10",
    weight: 7,
    positiveAnswer: "yes",
    remediationHint: "Documentează originea, procesarea și calitatea datelor de antrenament. Rulează analize de bias. Menține un data card / model card.",
    category: "data_governance",
  },
  {
    id: "q7-transparency",
    text: "Utilizatorii sunt informați că interacționează cu un sistem AI (transparență Art. 13)?",
    hint: "Sistemele de risc ridicat trebuie să fie transparente față de utilizatori: capabilități, limitări, nivel de acuratețe, contact pentru întrebări.",
    legalRef: "EU AI Act Art. 13",
    weight: 7,
    positiveAnswer: "yes",
    remediationHint: "Adaugă notificări clare că utilizatorii interacționează cu AI. Publică instrucțiunile de utilizare. Menționează limitele și acuratețea.",
    category: "transparency",
  },
  {
    id: "q8-logging",
    text: "Există logging automat al deciziilor sistemului (trasabilitate Art. 12)?",
    hint: "Sistemele de risc ridicat trebuie să logheze automat evenimentele relevante: decizii, inputuri, timestamps, pentru a permite auditul.",
    legalRef: "EU AI Act Art. 12",
    weight: 6,
    positiveAnswer: "yes",
    remediationHint: "Implementează logging structurat al deciziilor: input, output, timestamp, ID utilizator. Păstrează log-urile minim 6 luni.",
    category: "documentation",
  },
  {
    id: "q9-post-market",
    text: "Există un plan de monitorizare post-implementare (post-market monitoring)?",
    hint: "Providerii de sisteme de risc ridicat trebuie să monitorizeze performanța și să raporteze incidentele grave la autorități.",
    legalRef: "EU AI Act Art. 72–73",
    weight: 6,
    positiveAnswer: "yes",
    remediationHint: "Stabilește KPI-uri de monitorizare, un proces de raportare a incidentelor și un calendar de revizuire periodică a performanței.",
    category: "documentation",
  },
  {
    id: "q10-registration",
    text: "Sistemul de risc ridicat este înregistrat în baza de date UE (EU AI Act Art. 71)?",
    hint: "Sistemele de risc ridicat trebuie înregistrate în baza de date EU AI Act înainte de introducerea pe piață sau punerea în funcțiune.",
    legalRef: "EU AI Act Art. 71",
    weight: 5,
    positiveAnswer: "yes",
    remediationHint: "Înregistrează sistemul în EU AI Act database (euaidb.eu). Necesită documentația tehnică completă și declarația de conformitate.",
    category: "registration",
  },
]

// ── Scoring ───────────────────────────────────────────────────────────────────

export type AssessmentAnswers = Record<string, AssessmentAnswer>

export type AssessmentGapItem = {
  questionId: string
  question: string
  legalRef: string
  severity: "critical" | "high" | "medium"
  remediationHint: string
}

export type AssessmentResult = {
  score: number
  maxScore: number
  conformityPercent: number
  riskLabel: "risc-acceptabil" | "lacune-moderate" | "neconform-critic"
  gaps: AssessmentGapItem[]
  passedCount: number
  totalCount: number
}

function questionPasses(q: AssessmentQuestion, answer: AssessmentAnswer): boolean {
  if (answer === "na") return true
  if (q.positiveAnswer === "yes") return answer === "yes"
  return answer === "no"
}

function questionWeight(q: AssessmentQuestion, answer: AssessmentAnswer): number {
  if (answer === "na") return q.weight
  if (questionPasses(q, answer)) return q.weight
  if (answer === "partial") return Math.round(q.weight * 0.4)
  return 0
}

function gapSeverity(q: AssessmentQuestion): "critical" | "high" | "medium" {
  if (q.weight >= 9) return "critical"
  if (q.weight >= 7) return "high"
  return "medium"
}

// ── Annex IV document generator ───────────────────────────────────────────────

export type AnnexIVDocument = {
  title: string
  content: string
  generatedAtISO: string
}

type SystemForAnnexIV = {
  id: string
  name: string
  vendor: string
  modelType: string
  purpose: string
  riskLevel: string
  usesPersonalData: boolean
  makesAutomatedDecisions: boolean
  impactsRights: boolean
  hasHumanReview: boolean
  annexIIIHint?: string
  createdAtISO: string
}

export type AnnexIVBranding = {
  brandName: string
  logoUrl?: string | null
  signerName?: string | null
  signerTitle?: string | null
  contactEmail?: string | null
  website?: string | null
  isCustom?: boolean
}

function answerLabel(answer: AssessmentAnswer | undefined): string {
  if (!answer) return "—"
  const map: Record<AssessmentAnswer, string> = {
    yes: "Da ✅",
    no: "Nu ❌",
    partial: "Parțial ⚠️",
    na: "N/A",
  }
  return map[answer]
}

export function buildAnnexIVDocument(
  system: SystemForAnnexIV,
  answers: AssessmentAnswers,
  orgName?: string,
  branding?: AnnexIVBranding
): AnnexIVDocument {
  const now = new Date().toISOString()
  const dateStr = new Date(now).toLocaleDateString("ro-RO")
  const result = scoreAssessment(answers)

  const brandName = branding?.brandName?.trim() || "CompliRoAI"
  const isCustomBrand = branding?.isCustom === true && brandName !== "CompliRoAI"

  const riskLabelMap: Record<string, string> = {
    minimal: "Risc minimal",
    limited: "Risc limitat",
    high: "Risc ridicat",
  }

  const purposeMap: Record<string, string> = {
    "text-generation": "Generare text / conținut",
    "code-assistance": "Asistență cod",
    "data-analysis": "Analiză date",
    "customer-service": "Servicii clienți / chatbot",
    "document-processing": "Procesare documente",
    "decision-support": "Suport decizional",
    "image-processing": "Procesare imagini",
    "speech-recognition": "Recunoaștere vocală",
    recommendation: "Sistem de recomandare",
    other: "Altele",
  }

  const sections: string[] = []

  // Branded header (white-label cabinet name + optional logo)
  if (branding?.logoUrl) {
    sections.push(`![${brandName}](${branding.logoUrl})`, ``)
  }
  sections.push(
    `<!-- Generated by ${brandName} -->`,
    `**Pregătit de:** ${brandName}`,
    ``
  )

  sections.push(
    `# Documentație Tehnică — Anexa IV EU AI Act`,
    ``,
    orgName ? `**Organizație:** ${orgName}` : "",
    `**Sistem AI:** ${system.name}`,
    `**Data generării:** ${dateStr}`,
    `**Baza legală:** EU AI Act (Regulamentul UE 2024/1689) Art. 11 + Anexa IV`,
    ``,
    `---`,
    ``,
    `## 1. Descriere generală a sistemului AI`,
    ``,
    `| Câmp | Valoare |`,
    `|------|---------|`,
    `| Denumire sistem | ${system.name} |`,
    `| Furnizor / Provider | ${system.vendor} |`,
    `| Tip model | ${system.modelType} |`,
    `| Scop / Utilizare | ${purposeMap[system.purpose] ?? system.purpose} |`,
    `| Clasificare risc | ${riskLabelMap[system.riskLevel] ?? system.riskLevel} |`,
    `| Prelucrează date personale | ${system.usesPersonalData ? "Da" : "Nu"} |`,
    `| Ia decizii automate | ${system.makesAutomatedDecisions ? "Da" : "Nu"} |`,
    `| Impact asupra drepturilor | ${system.impactsRights ? "Da" : "Nu"} |`,
    `| Supraveghere umană directă | ${system.hasHumanReview ? "Da" : "Nu"} |`,
  )

  if (system.annexIIIHint) {
    sections.push(`| Notă Anexa III | ${system.annexIIIHint} |`)
  }

  sections.push(
    ``,
    `### 1.1 Context și scop`,
    ``,
    `> *Completați descrierea detaliată a scopului pentru care este utilizat sistemul AI, contextul organizațional și publicul vizat.*`,
    ``,
    `### 1.2 Versiune și data implementării`,
    ``,
    `| Versiune | Data punerii în funcțiune | Ultima modificare semnificativă |`,
    `|---------|--------------------------|--------------------------------|`,
    `| 1.0     | ${new Date(system.createdAtISO).toLocaleDateString("ro-RO")} | — |`,
    ``,
    `---`,
    ``,
    `## 2. Elemente tehnice și procesul de dezvoltare`,
    ``,
    `### 2.1 Arhitectura sistemului`,
    ``,
    `> *Descrieți arhitectura sistemului: componente principale, interfețe, fluxul de date de la intrare la ieșire.*`,
    ``,
    `### 2.2 Metodologia de antrenament și date`,
    ``,
    `**Evaluare guvernanță date (q6 — EU AI Act Art. 10):** ${answerLabel(answers["q6-data-governance"])}`,
    ``,
    `> *Descrieți originea și calitatea datelor de antrenament, metodologia de preprocesare și eventualele bias-uri identificate.*`,
    ``,
    `### 2.3 Sistem de management al calității (QMS)`,
    ``,
    `**Evaluare QMS (q5 — EU AI Act Art. 9):** ${answerLabel(answers["q5-qms"])}`,
    ``,
    `> *Descrieți politicile și procedurile QMS: gestionarea riscului, testare, responsabilități, revizuiri.*`,
    ``,
    `---`,
    ``,
    `## 3. Monitorizare, funcționare și control`,
    ``,
    `### 3.1 Supraveghere umană (Human in the Loop)`,
    ``,
    `**Evaluare supraveghere umană (q3 — EU AI Act Art. 14):** ${answerLabel(answers["q3-human-oversight"])}`,
    ``,
    `> *Descrieți mecanismele prin care operatorii umani pot supraveghea, corecta sau opri sistemul.*`,
    ``,
    `### 3.2 Logging și trasabilitate`,
    ``,
    `**Evaluare logging (q8 — EU AI Act Art. 12):** ${answerLabel(answers["q8-logging"])}`,
    ``,
    `> *Descrieți ce evenimente sunt înregistrate automat: decizii, inputuri, timestamp-uri, ID utilizator.*`,
    ``,
    `### 3.3 Monitorizare post-implementare`,
    ``,
    `**Evaluare post-market monitoring (q9 — EU AI Act Art. 72–73):** ${answerLabel(answers["q9-post-market"])}`,
    ``,
    `> *Descrieți planul de monitorizare continuă: KPI-uri, praguri de alertă, frecvența revizuirilor.*`,
    ``,
    `---`,
    ``,
    `## 4. Transparență față de utilizatori`,
    ``,
    `**Evaluare transparență (q7 — EU AI Act Art. 13):** ${answerLabel(answers["q7-transparency"])}`,
    ``,
    `> *Descrieți cum sunt informați utilizatorii că interacționează cu un sistem AI, inclusiv limitele și acuratețea.*`,
    ``,
    `---`,
    ``,
    `## 5. Evaluarea riscului`,
    ``,
    `### 5.1 Clasificare risc`,
    ``,
    `**Anexa III — sisteme de risc ridicat (q1 — EU AI Act Art. 6):** ${answerLabel(answers["q1-risk-class"])}`,
    ``,
    `**Practici interzise (q2 — EU AI Act Art. 5):** ${answerLabel(answers["q2-prohibited"])}`,
    ``,
    `### 5.2 Scor conformitate curent`,
    ``,
    `| Metric | Valoare |`,
    `|--------|---------|`,
    `| Scor conformitate | ${result.conformityPercent}% |`,
    `| Evaluare | ${result.riskLabel === "risc-acceptabil" ? "Risc acceptabil ✅" : result.riskLabel === "lacune-moderate" ? "Lacune moderate ⚠️" : "Neconform critic ❌"} |`,
    `| Întrebări evaluate | ${result.passedCount}/${result.totalCount} |`,
    ``,
    `---`,
    ``,
    `## 6. Securitate cibernetică`,
    ``,
    `> *Descrieți măsurile tehnice și organizatorice care asigură reziliența sistemului față de tentative de manipulare sau atac (Art. 15).*`,
    ``,
    `---`,
    ``,
    `## 7. Înregistrare în baza de date EU AI Act`,
    ``,
    `**Evaluare înregistrare (q10 — EU AI Act Art. 71):** ${answerLabel(answers["q10-registration"])}`,
    ``,
    `> *Pentru sistemele de risc ridicat: confirmați înregistrarea în EU AI Act database și atașați numărul de înregistrare.*`,
    ``,
    `---`,
    ``,
    `## 8. Gap analysis — Lacune identificate`,
    ``,
  )

  if (result.gaps.length === 0) {
    sections.push(`✅ Nicio lacună identificată la evaluarea curentă.`, ``)
  } else {
    sections.push(
      `> ⚠️ Următoarele lacune trebuie remediate înainte de certificare.`,
      ``,
    )
    for (const gap of result.gaps) {
      const sev =
        gap.severity === "critical" ? "🔴 Critic" : gap.severity === "high" ? "🟡 Ridicat" : "🟠 Mediu"
      sections.push(
        `### ${sev}: ${gap.question}`,
        ``,
        `**Referință legală:** ${gap.legalRef}`,
        ``,
        `**Acțiune recomandată:** ${gap.remediationHint}`,
        ``,
      )
    }
  }

  const signerNameRow = branding?.signerName?.trim()
    ? `${branding.signerName.trim()}${branding.signerTitle ? `, ${branding.signerTitle.trim()}` : ""}`
    : "_________________"

  sections.push(
    `---`,
    ``,
    `## 9. Declarație și responsabilitate`,
    ``,
    `Subsemnații confirmăm că informațiile din această documentație tehnică sunt corecte și complete la data generării.`,
    ``,
    `| Rol | Nume | Semnătură | Data |`,
    `|-----|------|-----------|------|`,
    `| Responsabil cabinet consultanță | ${signerNameRow} | _________________ | ${dateStr} |`,
    `| Responsabil sistem AI (organizație) | _________________ | _________________ | ${dateStr} |`,
    `| Responsabil conformitate | _________________ | _________________ | ${dateStr} |`,
    `| Reprezentant legal | _________________ | _________________ | ${dateStr} |`,
    ``,
  )

  // Branded contact / footer block
  const contactLines: string[] = []
  if (branding?.signerName) contactLines.push(`**${branding.signerName.trim()}**`)
  if (branding?.signerTitle) contactLines.push(branding.signerTitle.trim())
  contactLines.push(brandName)
  if (branding?.contactEmail) contactLines.push(`Email: ${branding.contactEmail.trim()}`)
  if (branding?.website) contactLines.push(`Web: ${branding.website.trim()}`)

  if (contactLines.length > 1 || (contactLines.length === 1 && contactLines[0] !== brandName)) {
    sections.push(`### Contact cabinet`, ``, contactLines.join("  \n"), ``)
  }

  sections.push(
    `---`,
    ``,
    `⚠️ *Acest document a fost generat automat de ${brandName}${isCustomBrand ? " (powered by CompliRoAI)" : ""}. Verifică cu un specialist înainte de utilizare oficială sau depunere la autorități.*`,
  )

  return {
    title: `Documentație Tehnică Anexa IV — ${system.name}`,
    content: sections.filter((l) => l !== null && l !== undefined).join("\n"),
    generatedAtISO: now,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//   Art. 47 — EU Declaration of Conformity (Annex V content)
// ─────────────────────────────────────────────────────────────────────────────
// Regulament (UE) 2024/1689, Articolul 47 + Anexa V:
// EU Declaration of Conformity must contain (minimum):
//   1. Numele + tipul HRAIS + cod identificare unic.
//   2. Numele + adresa providerului (și a reprezentantului autorizat, dacă există).
//   3. Declarație că EU DoC este emisă pe responsabilitatea exclusivă a providerului.
//   4. Declarație că HRAIS respectă Regulamentul (UE) 2024/1689 + alte acte UE aplicabile.
//   5. Referințe la standardele armonizate / specificațiile comune utilizate.
//   6. Dacă cazul: numele + ID notified body + descrierea procedurii conformity
//      assessment + referință certificat.
//   7. Loc + dată emitere + nume + funcție + semnătură.
// Limbă: oficială UE a Statului Membru. Update continuu (Art. 47(2)).

export type EUDeclarationInputs = {
  /** Câmpul 1 — codul unic de identificare (ex: număr serie, UUID intern). */
  uniqueIdentifier: string
  /** Câmpul 2 — adresa providerului. */
  providerAddress: string
  /** Câmpul 2 — opțional: reprezentant autorizat în UE (provider non-UE). */
  authorisedRepresentative?: {
    name: string
    address: string
  }
  /** Câmpul 5 — standardele armonizate aplicate (ex: ISO/IEC 42001, ISO/IEC 23894). */
  harmonisedStandards?: string[]
  /** Câmpul 5 — specificații comune (Art. 41) aplicate, dacă există. */
  commonSpecifications?: string[]
  /** Câmpul 6 — informații despre notified body (Anexa VII), dacă există. */
  notifiedBody?: {
    name: string
    /** ID-ul numeric atribuit de Comisie. */
    identificationNumber: string
    /** Descrierea procedurii — implicit Anexa VI sau Anexa VII. */
    assessmentProcedure:
      | "Anexa VI — Internal Control"
      | "Anexa VII — QMS + Tech Doc Assessment"
    /** Referința certificatului de conformitate emis de NB. */
    certificateReference?: string
  }
  /** Câmpul 7 — locul emiterii. */
  placeOfIssue: string
  /** Câmpul 7 — numele semnatarului. */
  signerName: string
  /** Câmpul 7 — funcția semnatarului. */
  signerTitle: string
  /** Limba versiunii (default `ro` pentru România). */
  language?: "ro" | "en"
}

export type EUDeclarationDocument = {
  title: string
  content: string
  generatedAtISO: string
}

export function buildEUDeclarationOfConformity(
  system: SystemForAnnexIV,
  inputs: EUDeclarationInputs,
  orgName: string,
  branding?: AnnexIVBranding
): EUDeclarationDocument {
  const now = new Date().toISOString()
  const dateStr = new Date(now).toLocaleDateString("ro-RO")
  const brandName = branding?.brandName?.trim() || "CompliRoAI"
  const isCustomBrand = branding?.isCustom === true && brandName !== "CompliRoAI"
  const language = inputs.language ?? "ro"

  const sections: string[] = []

  if (branding?.logoUrl) {
    sections.push(`![${brandName}](${branding.logoUrl})`, ``)
  }

  sections.push(
    `# DECLARAȚIA UE DE CONFORMITATE`,
    `## EU Declaration of Conformity (Art. 47 + Anexa V)`,
    ``,
    `**Baza legală:** Regulamentul (UE) 2024/1689 al Parlamentului European și al Consiliului din 13 iunie 2024 (EU AI Act) — Articolul 47 + Anexa V.`,
    `**Limba versiunii:** ${language === "ro" ? "română" : "engleză"}.`,
    ``,
    `---`,
    ``,
    `## 1. Sistem AI cu risc ridicat (HRAIS)`,
    ``,
    `| Câmp | Valoare |`,
    `|------|---------|`,
    `| Denumire | ${system.name} |`,
    `| Tip / Model | ${system.modelType} |`,
    `| Scop propus | ${system.purpose} |`,
    `| Cod unic de identificare | ${inputs.uniqueIdentifier} |`,
    ``,
    `## 2. Provider`,
    ``,
    `**Nume / denumire:** ${orgName}`,
    `**Adresă:** ${inputs.providerAddress}`,
  )

  if (inputs.authorisedRepresentative) {
    sections.push(
      ``,
      `**Reprezentant autorizat în UE (Art. 22):**`,
      `- Nume: ${inputs.authorisedRepresentative.name}`,
      `- Adresă: ${inputs.authorisedRepresentative.address}`,
    )
  }

  sections.push(
    ``,
    `## 3. Declarație de responsabilitate exclusivă`,
    ``,
    `Prezenta Declarație UE de Conformitate este emisă **pe responsabilitatea exclusivă a providerului** identificat la secțiunea 2 supra.`,
    ``,
    `## 4. Conformitate cu legislația aplicabilă`,
    ``,
    `Sistemul AI identificat la secțiunea 1 respectă:`,
    `- Regulamentul (UE) 2024/1689 (EU AI Act), în special cerințele Titlului III Capitolul 2 (Art. 8–15) pentru sisteme cu risc ridicat;`,
    `- Regulamentul (UE) 2016/679 (GDPR), unde sistemul prelucrează date cu caracter personal;`,
    `- Alte acte UE armonizate aplicabile (Anexa I a Regulamentului, dacă relevant).`,
    ``,
    `## 5. Standarde armonizate și specificații comune`,
    ``,
  )

  if (inputs.harmonisedStandards && inputs.harmonisedStandards.length > 0) {
    sections.push(`**Standarde armonizate aplicate (Art. 40):**`)
    for (const std of inputs.harmonisedStandards) {
      sections.push(`- ${std}`)
    }
    sections.push(``)
  } else {
    sections.push(
      `> ⚠️ Nu a fost declarat niciun standard armonizat. Specifică minim ISO/IEC 42001 sau echivalent dacă a fost utilizat. Dacă nu există standarde armonizate aplicabile, secțiunea poate rămâne goală — providerul demonstrează conformitatea prin tech doc (Anexa IV) și QMS (Art. 17).`,
      ``,
    )
  }

  if (inputs.commonSpecifications && inputs.commonSpecifications.length > 0) {
    sections.push(`**Specificații comune aplicate (Art. 41):**`)
    for (const cs of inputs.commonSpecifications) {
      sections.push(`- ${cs}`)
    }
    sections.push(``)
  }

  sections.push(
    `## 6. Notified body și certificat (Anexa VII)`,
    ``,
  )

  if (inputs.notifiedBody) {
    sections.push(
      `| Câmp | Valoare |`,
      `|------|---------|`,
      `| Nume notified body | ${inputs.notifiedBody.name} |`,
      `| ID numeric | ${inputs.notifiedBody.identificationNumber} |`,
      `| Procedura conformity assessment | ${inputs.notifiedBody.assessmentProcedure} |`,
      `| Referință certificat | ${inputs.notifiedBody.certificateReference ?? "—"} |`,
      ``,
    )
  } else {
    sections.push(
      `**Nu este implicat un notified body.** Conformity assessment a fost realizat pe baza Anexei VI (Internal Control) — aplicabil HRAIS din Anexa III punctele 2-8 sau când au fost aplicate integral standardele armonizate.`,
      ``,
    )
  }

  sections.push(
    `## 7. Loc, dată, semnătură`,
    ``,
    `**Loc emitere:** ${inputs.placeOfIssue}`,
    `**Data emiterii:** ${dateStr}`,
    ``,
    `**Semnat de:**`,
    `- Nume: ${inputs.signerName}`,
    `- Funcție: ${inputs.signerTitle}`,
    `- Semnătură: _________________________`,
    ``,
    `---`,
    ``,
    `### Obligația de actualizare`,
    ``,
    `Conform Art. 47(2), prezenta declarație trebuie **actualizată continuu** dacă apar modificări semnificative ale sistemului AI (Art. 43(4)) sau ale standardelor/cerințelor aplicabile. Versiunile anterioare se păstrează în Audit Pack pentru auditare.`,
    ``,
    `### Format`,
    ``,
    `Documentul este redactat în format **mașină-lizibil + uman-lizibil** (Markdown UTF-8) — îndeplinește cerința Art. 47(1).`,
    ``,
    `### Retenție`,
    ``,
    `Providerul păstrează prezenta declarație **minim 10 ani de la introducerea pe piață** a sistemului AI (Art. 18) și o pune la dispoziția autorităților naționale competente la cerere (Art. 21).`,
    ``,
    `---`,
    ``,
    `⚠️ *Document generat automat de ${brandName}${isCustomBrand ? " (powered by CompliRoAI)" : ""}. Verifică toate câmpurile cu jurist înainte de semnare și depunere oficială.*`,
  )

  return {
    title: `EU Declaration of Conformity — ${system.name}`,
    content: sections.join("\n"),
    generatedAtISO: now,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//   Art. 48 — CE marking checklist
// ─────────────────────────────────────────────────────────────────────────────
// Regulament (UE) 2024/1689, Articolul 48:
//   - CE marking vizibil, lizibil, indelebil pe HRAIS (sau pe ambalaj/doc dacă fizic imposibil).
//   - Digital CE marking acceptat pentru HRAIS pur digitale.
//   - Identificare numerică notified body alăturat (dacă există NB — Art. 43 + Anexa VII).
//   - Aplicat înainte de plasarea pe piață sau punerea în funcțiune.

export type CEMarkingChecklistItem = {
  id: string
  question: string
  legalRef: string
  /** Răspunsul considerat conform. */
  expected: "yes" | "no" | "na-acceptable"
  /** Severitate dacă răspunsul nu este cel așteptat. */
  severityIfFail: "critical" | "high" | "medium"
  /** Cui îi aplică. */
  appliesTo:
    | "all-hrais"
    | "physical-product"
    | "digital-only"
    | "notified-body-route"
}

export const CE_MARKING_CHECKLIST: CEMarkingChecklistItem[] = [
  {
    id: "ce-1-applied-before-market",
    question:
      "Marcajul CE este aplicat **înainte** de plasarea pe piață sau punerea în funcțiune a HRAIS?",
    legalRef: "EU AI Act Art. 48(1)",
    expected: "yes",
    severityIfFail: "critical",
    appliesTo: "all-hrais",
  },
  {
    id: "ce-2-visible",
    question:
      "Marcajul CE este aplicat **vizibil, lizibil și indelebil** pe HRAIS (pentru produse fizice)?",
    legalRef: "EU AI Act Art. 48(2)",
    expected: "yes",
    severityIfFail: "high",
    appliesTo: "physical-product",
  },
  {
    id: "ce-3-package-fallback",
    question:
      "Dacă aplicarea directă nu este posibilă fizic: marcajul este pe **ambalaj sau documentația care însoțește** sistemul?",
    legalRef: "EU AI Act Art. 48(2)",
    expected: "yes",
    severityIfFail: "high",
    appliesTo: "physical-product",
  },
  {
    id: "ce-4-digital-marking",
    question:
      "Pentru HRAIS **pur digital** (fără produs fizic): marcajul CE este afișat **digital** (UI sau metadata) într-un mod accesibil utilizatorului?",
    legalRef: "EU AI Act Art. 48(3)",
    expected: "yes",
    severityIfFail: "high",
    appliesTo: "digital-only",
  },
  {
    id: "ce-5-notified-body-id",
    question:
      "Dacă procedura conformity assessment a implicat notified body (Anexa VII): **numărul de identificare al NB** este afișat alături de CE?",
    legalRef: "EU AI Act Art. 48(4)",
    expected: "yes",
    severityIfFail: "high",
    appliesTo: "notified-body-route",
  },
  {
    id: "ce-6-eu-doc-available",
    question:
      "Există o **EU Declaration of Conformity** valabilă (Art. 47) care însoțește marcajul CE?",
    legalRef: "EU AI Act Art. 47 + Art. 48",
    expected: "yes",
    severityIfFail: "critical",
    appliesTo: "all-hrais",
  },
  {
    id: "ce-7-no-misleading",
    question:
      "Nu există alte marcaje, semne sau inscripții care ar putea **induce în eroare** terții cu privire la semnificația marcajului CE?",
    legalRef: "EU AI Act Art. 48(5)",
    expected: "yes",
    severityIfFail: "medium",
    appliesTo: "all-hrais",
  },
]

export type CEMarkingChecklistAnswers = Record<string, "yes" | "no" | "na">

export type CEMarkingChecklistResult = {
  hasPhysicalProduct: boolean
  hasNotifiedBody: boolean
  passed: number
  applicable: number
  gaps: Array<{
    id: string
    question: string
    legalRef: string
    severity: "critical" | "high" | "medium"
  }>
  verdict: "ready-for-ce" | "fixes-needed" | "blocked-critical"
}

export function evaluateCEMarkingChecklist(
  answers: CEMarkingChecklistAnswers,
  context: {
    hasPhysicalProduct: boolean
    hasNotifiedBody: boolean
  }
): CEMarkingChecklistResult {
  let passed = 0
  let applicable = 0
  const gaps: CEMarkingChecklistResult["gaps"] = []

  for (const item of CE_MARKING_CHECKLIST) {
    if (item.appliesTo === "physical-product" && !context.hasPhysicalProduct) continue
    if (item.appliesTo === "digital-only" && context.hasPhysicalProduct) continue
    if (item.appliesTo === "notified-body-route" && !context.hasNotifiedBody) continue

    applicable++
    const answer = answers[item.id] ?? "no"

    if (answer === item.expected || answer === "na") {
      passed++
    } else {
      gaps.push({
        id: item.id,
        question: item.question,
        legalRef: item.legalRef,
        severity: item.severityIfFail,
      })
    }
  }

  let verdict: CEMarkingChecklistResult["verdict"]
  if (gaps.some((g) => g.severity === "critical")) {
    verdict = "blocked-critical"
  } else if (gaps.length > 0) {
    verdict = "fixes-needed"
  } else {
    verdict = "ready-for-ce"
  }

  return {
    hasPhysicalProduct: context.hasPhysicalProduct,
    hasNotifiedBody: context.hasNotifiedBody,
    passed,
    applicable,
    gaps: gaps.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2 }
      return order[a.severity] - order[b.severity]
    }),
    verdict,
  }
}

export type CEMarkingChecklistDocument = {
  title: string
  content: string
  generatedAtISO: string
}

export function buildCEMarkingChecklistDocument(
  system: SystemForAnnexIV,
  answers: CEMarkingChecklistAnswers,
  context: { hasPhysicalProduct: boolean; hasNotifiedBody: boolean },
  orgName: string,
  branding?: AnnexIVBranding
): CEMarkingChecklistDocument {
  const now = new Date().toISOString()
  const dateStr = new Date(now).toLocaleDateString("ro-RO")
  const brandName = branding?.brandName?.trim() || "CompliRoAI"
  const isCustomBrand = branding?.isCustom === true && brandName !== "CompliRoAI"
  const result = evaluateCEMarkingChecklist(answers, context)

  const verdictLabel: Record<CEMarkingChecklistResult["verdict"], string> = {
    "ready-for-ce": "✅ Pregătit pentru aplicare CE",
    "fixes-needed": "⚠️ Lacune neblocante — remediere recomandată",
    "blocked-critical":
      "🔴 Blocat — lacune critice trebuie remediate înainte de plasarea pe piață",
  }

  const sections: string[] = []

  if (branding?.logoUrl) {
    sections.push(`![${brandName}](${branding.logoUrl})`, ``)
  }

  sections.push(
    `# Checklist Marcaj CE — Art. 48 EU AI Act`,
    ``,
    `**Sistem AI:** ${system.name}`,
    `**Organizație:** ${orgName}`,
    `**Data generării:** ${dateStr}`,
    `**Baza legală:** Regulamentul (UE) 2024/1689, Articolul 48.`,
    ``,
    `---`,
    ``,
    `## Verdict`,
    ``,
    `${verdictLabel[result.verdict]}`,
    ``,
    `**Itemuri conforme:** ${result.passed} / ${result.applicable}`,
    `**Produs fizic:** ${result.hasPhysicalProduct ? "Da" : "Nu — sistem pur digital"}`,
    `**Notified body implicat (Anexa VII):** ${result.hasNotifiedBody ? "Da" : "Nu — conformity assessment intern (Anexa VI)"}`,
    ``,
    `---`,
    ``,
    `## Checklist detaliat`,
    ``,
  )

  for (const item of CE_MARKING_CHECKLIST) {
    if (item.appliesTo === "physical-product" && !context.hasPhysicalProduct) continue
    if (item.appliesTo === "digital-only" && context.hasPhysicalProduct) continue
    if (item.appliesTo === "notified-body-route" && !context.hasNotifiedBody) continue

    const answer = answers[item.id] ?? "no"
    const ok = answer === item.expected || answer === "na"
    const icon = ok
      ? "✅"
      : item.severityIfFail === "critical"
      ? "🔴"
      : item.severityIfFail === "high"
      ? "🟡"
      : "🟠"
    const answerLbl = answer === "yes" ? "Da" : answer === "no" ? "Nu" : "N/A"

    sections.push(
      `### ${icon} ${item.question}`,
      ``,
      `- **Referință:** ${item.legalRef}`,
      `- **Răspuns:** ${answerLbl}`,
      `- **Așteptat:** ${item.expected === "yes" ? "Da" : item.expected === "no" ? "Nu" : "N/A acceptabil"}`,
      ``,
    )
  }

  if (result.gaps.length > 0) {
    sections.push(`---`, ``, `## Lacune identificate`, ``)
    for (const gap of result.gaps) {
      const sev =
        gap.severity === "critical"
          ? "🔴 Critic"
          : gap.severity === "high"
          ? "🟡 Ridicat"
          : "🟠 Mediu"
      sections.push(`- **${sev}** — ${gap.question} (${gap.legalRef})`)
    }
    sections.push(``)
  }

  sections.push(
    `---`,
    ``,
    `## Note legale`,
    ``,
    `- Marcajul CE confirmă că HRAIS respectă cerințele aplicabile ale Regulamentului (UE) 2024/1689 și ale altor acte UE armonizate.`,
    `- Pentru HRAIS pur digitale, marcajul CE poate fi afișat **digital** (Art. 48(3)) — în UI, în documentația tehnică digitală sau ca metadata interoperabilă.`,
    `- Numărul de identificare al notified body (dacă există) trebuie afișat **imediat alături** de marcajul CE (Art. 48(4)).`,
    `- Marcajul CE este aplicat de provider sau, dacă există, de reprezentantul autorizat (Art. 22 + Art. 48).`,
    `- **Sancțiune:** marcaj CE aplicat incorect → Art. 99 + autoritate națională de supraveghere a pieței poate cere retragerea de pe piață.`,
    ``,
    `---`,
    ``,
    `⚠️ *Acest checklist este pregătit de ${brandName}${isCustomBrand ? " (powered by CompliRoAI)" : ""}. Marcajul CE final trebuie validat de provider împreună cu jurist și, dacă este cazul, cu notified body.*`,
  )

  return {
    title: `Checklist Marcaj CE — ${system.name}`,
    content: sections.join("\n"),
    generatedAtISO: now,
  }
}

export function scoreAssessment(answers: AssessmentAnswers): AssessmentResult {
  let score = 0
  let maxScore = 0
  let passedCount = 0
  const gaps: AssessmentGapItem[] = []

  for (const q of AI_CONFORMITY_QUESTIONS) {
    const answer = answers[q.id] ?? "no"
    maxScore += q.weight
    const earned = questionWeight(q, answer)
    score += earned

    if (questionPasses(q, answer)) {
      passedCount++
    } else {
      gaps.push({
        questionId: q.id,
        question: q.text,
        legalRef: q.legalRef,
        severity: gapSeverity(q),
        remediationHint: q.remediationHint,
      })
    }
  }

  const conformityPercent = Math.round((score / maxScore) * 100)

  let riskLabel: AssessmentResult["riskLabel"]
  if (conformityPercent >= 80) riskLabel = "risc-acceptabil"
  else if (conformityPercent >= 50) riskLabel = "lacune-moderate"
  else riskLabel = "neconform-critic"

  return {
    score,
    maxScore,
    conformityPercent,
    riskLabel,
    gaps: gaps.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2 }
      return order[a.severity] - order[b.severity]
    }),
    passedCount,
    totalCount: AI_CONFORMITY_QUESTIONS.length,
  }
}
