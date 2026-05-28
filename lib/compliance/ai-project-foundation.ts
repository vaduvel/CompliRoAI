import type {
  AIActRole,
  AISystemRecord,
  ComplianceGateRiskClass,
  ComplianceState,
} from "./types"

export type AIProjectStage = "planned" | "pilot" | "live" | "retired"

export type GuidanceOwnerRole =
  | "DPO"
  | "Legal"
  | "IT"
  | "Product"
  | "Management"
  | "Security"
  | "Marketing"
  | "Cabinet"
  | "HR"
  | "Customer Support"
  | "Procurement"
  | "Engineering"
  | "Vendor Manager"
  | "Client Admin"

export type AIProjectProfile = {
  id: string
  name: string
  vendor: string
  purpose: AISystemRecord["purpose"]
  modelType: string
  stage: AIProjectStage
  aiActRole: Exclude<AIActRole, "mixed" | "exempt">
  riskClass: ComplianceGateRiskClass
  usesPersonalData: boolean
  makesAutomatedDecisions: boolean
  impactsRights: boolean
  hasHumanReview: boolean
  suggestedOwner: GuidanceOwnerRole
  evidenceGaps: string[]
}

export type ObligationTemplate = {
  id: string
  article: string
  title: string
  description: string
  appliesToRoles: AIProjectProfile["aiActRole"][]
  appliesToRiskClasses: ComplianceGateRiskClass[]
  ownerRole: GuidanceOwnerRole
  targetHref: string
  evidenceRequired: string[]
  actionTemplate: string
  deadlineLabel?: string
}

type AISystemWithProjectMeta = AISystemRecord & {
  projectStage?: AIProjectStage
  aiActRole?: AIProjectProfile["aiActRole"]
  projectOwnerRole?: GuidanceOwnerRole
}

const AI_ACT_ROLES: AIProjectProfile["aiActRole"][] = [
  "provider",
  "deployer",
  "importer",
  "distributor",
  "manufacturer",
]

export const AI_OBLIGATION_TEMPLATES: ObligationTemplate[] = [
  {
    id: "art-4-literacy",
    article: "Art. 4 AI Act",
    title: "AI Literacy pentru echipa care folosește sistemul",
    description:
      "Organizația trebuie să se asigure că personalul are competențe AI adecvate rolului și contextului de folosire.",
    appliesToRoles: ["provider", "deployer", "importer", "distributor", "manufacturer"],
    appliesToRiskClasses: ["minimal", "limited", "high", "unknown"],
    ownerRole: "Management",
    targetHref: "/dashboard/literacy",
    evidenceRequired: ["registru training", "participanți", "material curs", "atestare internă"],
    actionTemplate: "Planifică sau atașează dovada AI Literacy pentru echipa expusă sistemului.",
    deadlineLabel: "activ deja",
  },
  {
    id: "art-10-data-governance",
    article: "Art. 10 AI Act",
    title: "Data governance și evidence pentru seturile de date",
    description:
      "Providerul trebuie să poată demonstra proveniența, calitatea, reprezentativitatea și controlul bias-ului pentru datele folosite la dezvoltare/testare.",
    appliesToRoles: ["provider", "manufacturer"],
    appliesToRiskClasses: ["high"],
    ownerRole: "Product",
    targetHref: "/dashboard/ropa",
    evidenceRequired: [
      "dataset register",
      "proveniență date",
      "test reprezentativitate/bias",
      "lawful basis/purpose compatibility",
    ],
    actionTemplate:
      "Leagă dataset register-ul de RoPA/DPIA și atașează dovezi de calitate, bias și proveniență.",
    deadlineLabel: "înainte de lansare / 2 aug 2026",
  },
  {
    id: "art-11-annex-iv",
    article: "Art. 11 AI Act",
    title: "Documentație tehnică Annex IV",
    description:
      "Providerul unui sistem high-risk trebuie să mențină documentația tehnică înainte de punerea pe piață.",
    appliesToRoles: ["provider", "manufacturer"],
    appliesToRiskClasses: ["high"],
    ownerRole: "Product",
    targetHref: "/dashboard/sisteme/eu-db-wizard",
    evidenceRequired: ["arhitectură sistem", "date training/test", "măsuri oversight", "monitorizare"],
    actionTemplate: "Finalizează secțiunile lipsă din Annex IV și pregătește exportul pentru audit.",
    deadlineLabel: "înainte de lansare / 2 aug 2026",
  },
  {
    id: "art-12-logging",
    article: "Art. 12 AI Act",
    title: "Jurnalizare automată",
    description: "Sistemele high-risk trebuie să permită logging suficient pentru trasabilitate.",
    appliesToRoles: ["provider", "deployer", "manufacturer"],
    appliesToRiskClasses: ["high"],
    ownerRole: "IT",
    targetHref: "/dashboard/logging-evidence",
    evidenceRequired: ["config logging", "retenție minim 6 luni", "export log", "integritate hash/signed writes"],
    actionTemplate: "Atașează schema de logging și dovada retenției pentru sistemul high-risk.",
    deadlineLabel: "2 aug 2026 / înainte de producție",
  },
  {
    id: "art-13-deployer-instructions",
    article: "Art. 13 AI Act",
    title: "Instrucțiuni versionate pentru deployeri",
    description:
      "Providerul trebuie să ofere instrucțiuni clare despre intended purpose, limite, performanță, oversight, resurse și condiții de utilizare.",
    appliesToRoles: ["provider", "manufacturer"],
    appliesToRiskClasses: ["high"],
    ownerRole: "Legal",
    targetHref: "/dashboard/conformitate",
    evidenceRequired: [
      "deployer instruction pack",
      "limitations statement",
      "performance characteristics",
      "maintenance/oversight instructions",
    ],
    actionTemplate:
      "Generează instruction pack-ul pentru deployer și pune-l sub version control în dosarul de conformitate.",
    deadlineLabel: "înainte de punere pe piață",
  },
  {
    id: "art-14-human-oversight",
    article: "Art. 14 AI Act",
    title: "Protocol supraveghere umană",
    description: "Sistemele high-risk au nevoie de oversight uman proporțional și documentat.",
    appliesToRoles: ["provider", "deployer", "manufacturer"],
    appliesToRiskClasses: ["high"],
    ownerRole: "Product",
    targetHref: "/dashboard/human-oversight",
    evidenceRequired: ["protocol oversight", "responsabili", "procedură stop/fallback", "training operatori"],
    actionTemplate: "Definește omul responsabil, când intervine și cum se oprește sistemul.",
    deadlineLabel: "2 aug 2026 / înainte de producție",
  },
  {
    id: "art-15-accuracy-robustness-cyber",
    article: "Art. 15 AI Act",
    title: "Acuratețe, robustețe și securitate cibernetică",
    description:
      "Sistemele high-risk trebuie să aibă niveluri adecvate de acuratețe, robustețe și cybersecurity, documentate prin metrici și teste.",
    appliesToRoles: ["provider", "manufacturer"],
    appliesToRiskClasses: ["high"],
    ownerRole: "Security",
    targetHref: "/dashboard/post-market-monitoring",
    evidenceRequired: [
      "metric registry",
      "test plan",
      "robustness/adversarial test evidence",
      "cybersecurity assessment",
    ],
    actionTemplate:
      "Atașează metricile declarate, planul de test și dovada de robustețe/cybersecurity pentru sistemul high-risk.",
    deadlineLabel: "înainte de lansare / monitorizare continuă",
  },
  {
    id: "art-17-qms",
    article: "Art. 17 AI Act",
    title: "Sistem de management al calității (QMS)",
    description: "Providerul trebuie să opereze un QMS documentat pentru sistemele AI high-risk.",
    appliesToRoles: ["provider", "manufacturer"],
    appliesToRiskClasses: ["high"],
    ownerRole: "Management",
    targetHref: "/dashboard/qms",
    evidenceRequired: ["politică QMS", "proceduri", "control documente", "audit intern"],
    actionTemplate: "Completează QMS workspace și leagă evidence-ul din Annex IV, PMM și incidente.",
    deadlineLabel: "2 aug 2026",
  },
  {
    id: "art-23-25-value-chain",
    article: "Art. 23-25 AI Act",
    title: "Lanț de valoare și schimbare de rol",
    description:
      "Importerii, distribuitorii și deployerii care modifică, rebranduiesc sau schimbă intended purpose pot prelua obligații de provider.",
    appliesToRoles: ["deployer", "importer", "distributor"],
    appliesToRiskClasses: ["limited", "high", "unknown"],
    ownerRole: "Legal",
    targetHref: "/dashboard/role-assessment",
    evidenceRequired: [
      "CE/doc check",
      "substantial modification assessment",
      "upstream provider confirmation",
      "role-switch decision log",
    ],
    actionTemplate:
      "Rulează value-chain check: confirmă dacă modificările/rebranding-ul schimbă rolul legal al organizației.",
    deadlineLabel: "înainte de revânzare / deploy modificat",
  },
  {
    id: "art-26-deployer",
    article: "Art. 26 AI Act",
    title: "Obligații deployer high-risk",
    description:
      "Deployerul trebuie să folosească sistemul conform instrucțiunilor, să monitorizeze și să păstreze log-uri când sunt sub controlul său.",
    appliesToRoles: ["deployer"],
    appliesToRiskClasses: ["high"],
    ownerRole: "DPO",
    targetHref: "/dashboard/resolve",
    evidenceRequired: ["instrucțiuni vendor", "procedură utilizare", "monitorizare internă", "log-uri relevante"],
    actionTemplate: "Verifică obligațiile deployer și atașează instrucțiunile vendor + procedura internă.",
    deadlineLabel: "2 aug 2026",
  },
  {
    id: "art-27-fria",
    article: "Art. 27 AI Act",
    title: "FRIA pentru impact asupra drepturilor fundamentale",
    description:
      "Anumite deployări high-risk necesită evaluarea impactului asupra drepturilor fundamentale înainte de utilizare.",
    appliesToRoles: ["deployer"],
    appliesToRiskClasses: ["high"],
    ownerRole: "Legal",
    targetHref: "/dashboard/fria",
    evidenceRequired: ["FRIA completă", "mitigări", "review legal/DPO", "notificare dacă se aplică"],
    actionTemplate: "Rulează FRIA și confirmă dacă use-case-ul intră în categoriile Art. 27.",
    deadlineLabel: "înainte de utilizare / 2 aug 2026",
  },
  {
    id: "art-49-eu-db",
    article: "Art. 49 AI Act",
    title: "Înregistrare EU Database",
    description: "Providerul trebuie să înregistreze anumite sisteme high-risk în baza de date UE.",
    appliesToRoles: ["provider", "manufacturer"],
    appliesToRiskClasses: ["high"],
    ownerRole: "Legal",
    targetHref: "/dashboard/sisteme/eu-db-wizard",
    evidenceRequired: ["draft EU DB", "date sistem", "rol provider", "confirmare submit"],
    actionTemplate: "Completează wizard-ul EU Database și pregătește exportul pentru depunere.",
    deadlineLabel: "înainte de punere pe piață",
  },
  {
    id: "art-47-eu-declaration",
    article: "Art. 47 AI Act",
    title: "Declarație UE de conformitate",
    description:
      "Providerul high-risk trebuie să emită și să păstreze declarația UE de conformitate conform Annex V.",
    appliesToRoles: ["provider", "manufacturer"],
    appliesToRiskClasses: ["high"],
    ownerRole: "Legal",
    targetHref: "/dashboard/conformitate",
    evidenceRequired: [
      "EU declaration draft",
      "Annex V fields",
      "semnătură responsabil",
      "versioning + retention",
    ],
    actionTemplate:
      "Finalizează declarația UE de conformitate și include-o în Audit Pack cu semnătură/versionare.",
    deadlineLabel: "înainte de punere pe piață",
  },
  {
    id: "art-50-transparency",
    article: "Art. 50 AI Act",
    title: "Notificări de transparență și etichetare conținut AI",
    description: "Sistemele care interacționează cu persoane sau generează conținut sintetic au obligații de transparență.",
    appliesToRoles: ["provider", "deployer", "importer", "distributor", "manufacturer"],
    appliesToRiskClasses: ["limited", "minimal", "high", "unknown"],
    ownerRole: "DPO",
    targetHref: "/dashboard/transparency",
    evidenceRequired: ["text notificare", "screenshot UI", "metadata/watermark dacă e conținut sintetic"],
    actionTemplate: "Generează notificarea Art. 50 și atașează dovada de publicare.",
    deadlineLabel: "2 dec 2026 [POST-OMNIBUS]",
  },
  {
    id: "art-53-55-gpai-package",
    article: "Art. 53-55 AI Act",
    title: "GPAI provider package",
    description:
      "Providerii de modele GPAI trebuie să pregătească documentație tehnică, informații pentru downstream, policy de copyright și summary public al datelor de training.",
    appliesToRoles: ["provider", "manufacturer"],
    appliesToRiskClasses: ["high", "unknown"],
    ownerRole: "Legal",
    targetHref: "/dashboard/resolve",
    evidenceRequired: [
      "GPAI technical documentation",
      "downstream information pack",
      "copyright policy",
      "training-data summary",
    ],
    actionTemplate:
      "Dacă sistemul este GPAI/foundation/fine-tuned model, pregătește pachetul Art. 53-55 și marchează systemic-risk dacă se aplică.",
    deadlineLabel: "2 aug 2025 / după caz",
  },
  {
    id: "art-86-explanation",
    article: "Art. 86 AI Act",
    title: "Workflow pentru explicații către persoane afectate",
    description:
      "Pentru decizii individuale cu efect juridic/semnificativ, organizația trebuie să poată explica rolul sistemului AI și elementele deciziei.",
    appliesToRoles: ["deployer"],
    appliesToRiskClasses: ["high"],
    ownerRole: "DPO",
    targetHref: "/dashboard/dsar",
    evidenceRequired: [
      "explanation request intake",
      "decision factors",
      "human review note",
      "response log",
    ],
    actionTemplate:
      "Pregătește fluxul de explicații pentru persoanele afectate și conectează-l cu DSAR/DPIA.",
    deadlineLabel: "la cerere / înainte de utilizare high-risk",
  },
  {
    id: "gdpr-art-28-dpa",
    article: "GDPR Art. 28",
    title: "DPA / processor terms pentru vendor AI",
    description: "Când vendorul AI procesează date personale, trebuie contract DPA sau termeni echivalenți.",
    appliesToRoles: ["provider", "deployer", "importer", "distributor", "manufacturer"],
    appliesToRiskClasses: ["minimal", "limited", "high", "unknown"],
    ownerRole: "DPO",
    targetHref: "/dashboard/vendor-review",
    evidenceRequired: ["DPA semnat", "sub-procesatori", "transfer mechanism", "security terms"],
    actionTemplate: "Solicită/atașează DPA și verifică transferurile internaționale.",
    deadlineLabel: "înainte de procesarea datelor personale",
  },
  {
    id: "gdpr-art-35-dpia",
    article: "GDPR Art. 35",
    title: "DPIA pentru AI cu risc privacy ridicat",
    description: "Prelucrarea cu tehnologii noi și risc ridicat pentru persoane necesită DPIA.",
    appliesToRoles: ["provider", "deployer", "importer", "distributor", "manufacturer"],
    appliesToRiskClasses: ["high", "limited", "unknown"],
    ownerRole: "DPO",
    targetHref: "/dashboard/dpia",
    evidenceRequired: ["DPIA completă", "măsuri", "risc rezidual", "aprobare"],
    actionTemplate: "Completează DPIA și atașează aprobarea riscului rezidual.",
    deadlineLabel: "înainte de prelucrare",
  },
]

export function buildAIProjectProfiles(state: ComplianceState): AIProjectProfile[] {
  return (state.aiSystems ?? []).map((system) => buildAIProjectProfile(system, state))
}

export function buildAIProjectProfile(
  system: AISystemRecord,
  state: ComplianceState,
): AIProjectProfile {
  const meta = system as AISystemWithProjectMeta
  const role = normalizeProjectRole(meta.aiActRole) ?? inferRoleFromState(state)
  return {
    id: system.id,
    name: system.name,
    vendor: system.vendor,
    purpose: system.purpose,
    modelType: system.modelType,
    stage: normalizeStage(meta.projectStage) ?? inferStage(system),
    aiActRole: role,
    riskClass: normalizeRiskClass(system.riskLevel),
    usesPersonalData: system.usesPersonalData,
    makesAutomatedDecisions: system.makesAutomatedDecisions,
    impactsRights: system.impactsRights,
    hasHumanReview: system.hasHumanReview,
    suggestedOwner: meta.projectOwnerRole ?? inferOwner(role, system),
    evidenceGaps: inferEvidenceGaps(system),
  }
}

export function getObligationTemplatesForProject(project: AIProjectProfile): ObligationTemplate[] {
  return AI_OBLIGATION_TEMPLATES.filter((template) => {
    const roleMatches = template.appliesToRoles.includes(project.aiActRole)
    const riskMatches = template.appliesToRiskClasses.includes(project.riskClass)
    const personalDataMatches =
      !template.id.startsWith("gdpr-") || project.usesPersonalData || project.makesAutomatedDecisions
    const gpaiMatches =
      template.id !== "art-53-55-gpai-package" || projectLooksLikeGPAI(project)
    return roleMatches && riskMatches && personalDataMatches && gpaiMatches
  })
}

function normalizeStage(value: unknown): AIProjectStage | undefined {
  return value === "planned" || value === "pilot" || value === "live" || value === "retired"
    ? value
    : undefined
}

function normalizeProjectRole(value: unknown): AIProjectProfile["aiActRole"] | undefined {
  return AI_ACT_ROLES.includes(value as AIProjectProfile["aiActRole"])
    ? (value as AIProjectProfile["aiActRole"])
    : undefined
}

function inferRoleFromState(state: ComplianceState): AIProjectProfile["aiActRole"] {
  const primary = state.roleAssessment?.primaryRole
  if (normalizeProjectRole(primary)) return primary as AIProjectProfile["aiActRole"]
  const firstSecondary = state.roleAssessment?.secondaryRoles
    ?.map((role) => normalizeProjectRole(role))
    .find((role): role is AIProjectProfile["aiActRole"] => Boolean(role))
  return firstSecondary ?? "deployer"
}

function inferStage(system: AISystemRecord): AIProjectStage {
  if (system.approvalStatus === "approved") return "live"
  if (system.approvalStatus === "rejected") return "retired"
  if (system.approvalStatus === "pending") return "pilot"
  return "planned"
}

function normalizeRiskClass(risk: AISystemRecord["riskLevel"]): ComplianceGateRiskClass {
  if (risk === "high") return "high"
  if (risk === "limited") return "limited"
  if (risk === "minimal") return "minimal"
  return "unknown"
}

function inferOwner(role: AIProjectProfile["aiActRole"], system: AISystemRecord): GuidanceOwnerRole {
  if (role === "provider" || role === "manufacturer") return "Product"
  if (system.usesPersonalData) return "DPO"
  if (system.purpose === "marketing-personalization") return "Marketing"
  return "Legal"
}

function inferEvidenceGaps(system: AISystemRecord): string[] {
  const gaps: string[] = []
  if (system.usesPersonalData) gaps.push("DPA / DPIA / transfer review")
  if (system.riskLevel === "high" && !system.hasHumanReview) gaps.push("protocol supraveghere umană")
  if (system.riskLevel === "high") {
    gaps.push("logging / PMM / QMS evidence")
    gaps.push("dataset provenance / representativeness / bias evidence")
    gaps.push("accuracy / robustness / cybersecurity evidence")
    gaps.push("deployer instruction pack")
    gaps.push("EU declaration of conformity")
  }
  if (system.riskLevel === "limited") gaps.push("notificare transparență Art. 50")
  if (systemLooksLikeGPAI(system)) gaps.push("GPAI technical/copyright/training-data summary")
  return gaps
}

function projectLooksLikeGPAI(project: AIProjectProfile): boolean {
  return systemLooksLikeGPAI({
    name: project.name,
    vendor: project.vendor,
    purpose: project.purpose,
    modelType: project.modelType,
  } as AISystemRecord)
}

function systemLooksLikeGPAI(system: Pick<AISystemRecord, "name" | "vendor" | "purpose" | "modelType">): boolean {
  const haystack = `${system.name} ${system.vendor} ${system.modelType} ${system.purpose}`.toLowerCase()
  return /(gpai|general[-\s]?purpose|foundation|frontier|base model|fine[-\s]?tun|llm platform|model provider)/.test(haystack)
}
