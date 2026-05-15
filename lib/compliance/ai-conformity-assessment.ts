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
  orgName?: string
): AnnexIVDocument {
  const now = new Date().toISOString()
  const dateStr = new Date(now).toLocaleDateString("ro-RO")
  const result = scoreAssessment(answers)

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

  sections.push(
    `---`,
    ``,
    `## 9. Declarație și responsabilitate`,
    ``,
    `Subsemnații confirmăm că informațiile din această documentație tehnică sunt corecte și complete la data generării.`,
    ``,
    `| Rol | Nume | Semnătură | Data |`,
    `|-----|------|-----------|------|`,
    `| Responsabil sistem AI | _________________ | _________________ | ${dateStr} |`,
    `| Responsabil conformitate | _________________ | _________________ | ${dateStr} |`,
    `| Reprezentant legal | _________________ | _________________ | ${dateStr} |`,
    ``,
    `---`,
    ``,
    `⚠️ *Acest document a fost generat automat. Verifică cu un specialist înainte de utilizare oficială sau depunere la autorități.*`,
  )

  return {
    title: `Documentație Tehnică Anexa IV — ${system.name}`,
    content: sections.filter((l) => l !== null && l !== undefined).join("\n"),
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
