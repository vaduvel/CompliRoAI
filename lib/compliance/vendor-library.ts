/**
 * Sprint 010 — Vendor library catalog pentru AI vendors.
 *
 * Subset adaptat din donor v3-unified `lib/compliance/vendor-library.ts`
 * (1195 LOC, 70+ vendori SaaS generali). Aici pastram doar furnizorii
 * RELEVANTI pentru AI/LLM/governance — pentru a alimenta prefill-ul
 * formularului de adaugare vendor in /dashboard/vendor-review.
 *
 * Skipped: e-commerce (Shopify), courier (Fan/Sameday), telecom (Orange),
 * payment (Stripe), accounting (SmartBill, Saga), HR (Revisal, Colorful)
 * — toate sunt fie outside scope AI Act, fie deja gestionate in alte
 * module (ex. AI Inventory pentru AI tools usage).
 *
 * Kept: top AI vendors LLM/ML/Vector DB + cloud cu Azure OpenAI/Bedrock/
 * Vertex care sunt platforma AI; minus generic cloud unde AI nu e
 * principal.
 *
 * Per mandate § 11, library trebuie sa acopere: OpenAI, Microsoft
 * (Azure OpenAI + Copilot), Anthropic, Google (Gemini + Vertex), Mistral,
 * Meta (Llama API), Cohere, AWS Bedrock, IBM watsonx, Hugging Face,
 * ElevenLabs, Synthesia, Pinecone, Weaviate, Replicate, Stability AI.
 *
 * Pure data file — no I/O. Folosit de vendor-prefill (Sprint 010-4) si
 * /api/vendor-review/library (Sprint 010-8).
 */

import type {
  DPAStatus,
  VendorAITerms,
  VendorRecord,
  VendorRegion,
  VendorRole,
  VendorSecurityEvidence,
  VendorTransferMechanism,
} from "@/lib/compliance/types"

export type VendorLibraryEntry = {
  /** Stable slug ID — folosit pentru lookup. */
  id: string
  /** Nume canonical de afisat in UI. */
  canonicalName: string
  /** Persoane juridice cunoscute pentru DPA. */
  legalEntity?: string
  /** Toate aliasele cunoscute pentru search (lowercase). */
  aliases: string[]
  /** Produsele principale relevante AI Act / GDPR. */
  productCatalog: string[]
  /** Categoria serviciului — folosit pentru filtru UI. */
  serviceCategory: string
  /** Regiunea HQ-ului. */
  vendorRegion: VendorRegion
  /** Roul tipic in raport cu firma client (de obicei processor). */
  defaultRole: VendorRole
  /** URL public catre DPA (cand exista). */
  knownDpaUrl?: string
  /** URL public catre lista de subprocesatori. */
  knownSubprocessorsUrl?: string
  /** Subprocesatori cunoscuti (extrasi din pagini publice — orientativ). */
  knownSubprocessors: string[]
  /** Mecanism de transfer tipic (cand vendor-ul e in afara UE). */
  defaultTransferMechanism: VendorTransferMechanism
  /** Status DPA tipic la nivel comercial — orientativ, user confirma. */
  defaultDpaStatus: DPAStatus
  /** Security evidence orientativ. User confirma cu evidenta concreta. */
  defaultSecurityEvidence: Partial<VendorSecurityEvidence>
  /** AI-specific terms orientativ (cand vendor publica). */
  defaultAITerms: Partial<VendorAITerms>
  /** Risc orientativ la baseline (engine-ul recalculeaza pe context org). */
  defaultRiskLevel: "minimal" | "low" | "medium" | "high" | "critical"
  /** Nota explicativa scurta pentru DPO. */
  complianceNote: string
}

// ── Library catalog (17 AI vendors top) ─────────────────────────────────────

export const VENDOR_LIBRARY: VendorLibraryEntry[] = [
  // ═══ 1. OpenAI — leader LLM US ═══
  {
    id: "openai",
    canonicalName: "OpenAI",
    legalEntity: "OpenAI Ireland Limited",
    aliases: ["openai", "open ai", "chatgpt", "chat gpt", "gpt-4", "gpt-3", "gpt-3.5", "gpt-4o", "o1"],
    productCatalog: ["ChatGPT Enterprise", "ChatGPT Team", "OpenAI API", "Assistants API", "DALL·E API"],
    serviceCategory: "AI/LLM",
    vendorRegion: "US",
    defaultRole: "processor",
    knownDpaUrl: "https://openai.com/policies/data-processing-addendum",
    knownSubprocessorsUrl: "https://openai.com/policies/subprocessor-list",
    knownSubprocessors: ["Microsoft Azure", "Snowflake", "Stripe", "Functional Software (Sentry)"],
    defaultTransferMechanism: "scc_controller_processor",
    defaultDpaStatus: "missing",
    defaultSecurityEvidence: {
      soc2: true,
      iso27001: true,
      encryptionInTransit: true,
      encryptionAtRest: true,
      auditLogsAvailable: true,
    },
    defaultAITerms: {
      trainingDataOptOut: "default_opt_out",
      inputDataRetention: "days_30",
      outputRightsOwnership: "client",
      modelTransparency: "partial",
      reproducibilityGuarantees: false,
    },
    defaultRiskLevel: "high",
    complianceNote:
      "API business: zero training by default, retention 30 zile. ChatGPT consumer: opt-out manual. DPA online — verifica daca a fost signed pe contul firmei.",
  },
  // ═══ 2. Microsoft Azure OpenAI — fortified LLM EU ═══
  {
    id: "azure-openai",
    canonicalName: "Microsoft Azure OpenAI",
    legalEntity: "Microsoft Ireland Operations Limited",
    aliases: ["azure openai", "azure ai", "microsoft openai", "azure cognitive services"],
    productCatalog: ["Azure OpenAI Service", "Azure AI Studio", "Azure Cognitive Services"],
    serviceCategory: "AI/LLM",
    vendorRegion: "EU",
    defaultRole: "processor",
    knownDpaUrl:
      "https://www.microsoft.com/licensing/docs/view/Microsoft-Products-and-Services-Data-Protection-Addendum-DPA",
    knownSubprocessorsUrl: "https://servicetrust.microsoft.com/viewpage/SubprocessorList",
    knownSubprocessors: ["Microsoft Azure", "Microsoft data center subprocessors"],
    defaultTransferMechanism: "scc_controller_processor",
    defaultDpaStatus: "missing",
    defaultSecurityEvidence: {
      iso27001: true,
      soc2: true,
      encryptionInTransit: true,
      encryptionAtRest: true,
      mfaEnforced: true,
      auditLogsAvailable: true,
      penTestRecent: true,
    },
    defaultAITerms: {
      trainingDataOptOut: "yes",
      inputDataRetention: "no_retention",
      outputRightsOwnership: "client",
      modelTransparency: "partial",
      reproducibilityGuarantees: false,
    },
    defaultRiskLevel: "medium",
    complianceNote:
      "Variantă enterprise OpenAI hostata in EU regions (Sweden, France). Microsoft DPA standard acopera Azure OpenAI. Verifica selectia regiunii in portal.",
  },
  // ═══ 3. Microsoft 365 Copilot — productivity AI ═══
  {
    id: "microsoft-365-copilot",
    canonicalName: "Microsoft 365 Copilot",
    legalEntity: "Microsoft Ireland Operations Limited",
    aliases: ["copilot", "m365 copilot", "office copilot", "microsoft copilot"],
    productCatalog: ["Microsoft 365 Copilot", "Copilot Pro", "Copilot for Sales"],
    serviceCategory: "AI/Productivity",
    vendorRegion: "EU",
    defaultRole: "processor",
    knownDpaUrl:
      "https://www.microsoft.com/licensing/docs/view/Microsoft-Products-and-Services-Data-Protection-Addendum-DPA",
    knownSubprocessorsUrl: "https://servicetrust.microsoft.com/viewpage/SubprocessorList",
    knownSubprocessors: ["Microsoft Azure", "Bing"],
    defaultTransferMechanism: "scc_controller_processor",
    defaultDpaStatus: "missing",
    defaultSecurityEvidence: {
      iso27001: true,
      soc2: true,
      encryptionInTransit: true,
      encryptionAtRest: true,
      mfaEnforced: true,
      auditLogsAvailable: true,
    },
    defaultAITerms: {
      trainingDataOptOut: "yes",
      inputDataRetention: "session_only",
      outputRightsOwnership: "client",
      modelTransparency: "partial",
      reproducibilityGuarantees: false,
    },
    defaultRiskLevel: "medium",
    complianceNote:
      "Aplica DPA-ul global Microsoft. Acceseaza Microsoft Graph (email/files/calendar) — verifica controalele de acces si DPIA pentru date sensibile.",
  },
  // ═══ 4. Anthropic Claude ═══
  {
    id: "anthropic",
    canonicalName: "Anthropic (Claude)",
    legalEntity: "Anthropic, PBC",
    aliases: ["anthropic", "claude", "claude ai", "claude.ai", "claude-3", "claude-3-5", "sonnet", "opus"],
    productCatalog: ["Claude API", "Claude.ai", "Claude for Work", "Claude Enterprise"],
    serviceCategory: "AI/LLM",
    vendorRegion: "US",
    defaultRole: "processor",
    knownDpaUrl: "https://www.anthropic.com/legal/dpa",
    knownSubprocessorsUrl: "https://www.anthropic.com/legal/subprocessors",
    knownSubprocessors: ["Amazon Web Services", "Google Cloud", "CrowdStrike", "Cloudflare"],
    defaultTransferMechanism: "scc_controller_processor",
    defaultDpaStatus: "missing",
    defaultSecurityEvidence: {
      soc2: true,
      iso27001: true,
      encryptionInTransit: true,
      encryptionAtRest: true,
      auditLogsAvailable: true,
    },
    defaultAITerms: {
      trainingDataOptOut: "default_opt_out",
      inputDataRetention: "no_retention",
      outputRightsOwnership: "client",
      modelTransparency: "partial",
      reproducibilityGuarantees: false,
    },
    defaultRiskLevel: "medium",
    complianceNote:
      "API: zero retention si zero training default. Claude.ai consumer: retentie 30 zile, training optional. Verifica daca folosesti Bedrock/Vertex variants.",
  },
  // ═══ 5. Google Gemini + Vertex AI ═══
  {
    id: "google-vertex-ai",
    canonicalName: "Google Vertex AI / Gemini",
    legalEntity: "Google Ireland Limited",
    aliases: ["gemini", "google ai", "google gemini", "vertex ai", "google vertex", "bard"],
    productCatalog: ["Vertex AI", "Gemini API", "Gemini for Workspace", "Imagen"],
    serviceCategory: "AI/LLM",
    vendorRegion: "EU",
    defaultRole: "processor",
    knownDpaUrl: "https://cloud.google.com/terms/data-processing-addendum",
    knownSubprocessorsUrl: "https://cloud.google.com/terms/subprocessors",
    knownSubprocessors: ["Google Cloud", "Google internal data centers"],
    defaultTransferMechanism: "scc_controller_processor",
    defaultDpaStatus: "missing",
    defaultSecurityEvidence: {
      iso27001: true,
      soc2: true,
      encryptionInTransit: true,
      encryptionAtRest: true,
      mfaEnforced: true,
      auditLogsAvailable: true,
      penTestRecent: true,
    },
    defaultAITerms: {
      trainingDataOptOut: "yes",
      inputDataRetention: "no_retention",
      outputRightsOwnership: "client",
      modelTransparency: "partial",
      reproducibilityGuarantees: false,
    },
    defaultRiskLevel: "medium",
    complianceNote:
      "Vertex AI hostat in EU regions (eu-west, europe-west). DPA Google Cloud acopera. Gemini consumer NU foloseste DPA enterprise.",
  },
  // ═══ 6. Mistral AI — EU vendor ═══
  {
    id: "mistral",
    canonicalName: "Mistral AI",
    legalEntity: "Mistral AI SAS",
    aliases: ["mistral", "mistral ai", "mixtral", "mistral large", "le chat"],
    productCatalog: ["Mistral API", "Le Chat", "Mistral Large", "Codestral"],
    serviceCategory: "AI/LLM",
    vendorRegion: "EU",
    defaultRole: "processor",
    knownDpaUrl: "https://mistral.ai/terms/data-processing-agreement",
    knownSubprocessors: ["Microsoft Azure", "Google Cloud Platform"],
    defaultTransferMechanism: "adequacy_decision",
    defaultDpaStatus: "missing",
    defaultSecurityEvidence: {
      iso27001: false,
      soc2: true,
      encryptionInTransit: true,
      encryptionAtRest: true,
      auditLogsAvailable: true,
    },
    defaultAITerms: {
      trainingDataOptOut: "yes",
      inputDataRetention: "no_retention",
      outputRightsOwnership: "client",
      modelTransparency: "documented",
      reproducibilityGuarantees: false,
    },
    defaultRiskLevel: "low",
    complianceNote:
      "Vendor frantuzesc — date in UE by default. Recomandat pentru clienti sensibili la sovranitatea datelor.",
  },
  // ═══ 7. Meta Llama API ═══
  {
    id: "meta-llama",
    canonicalName: "Meta Llama API",
    legalEntity: "Meta Platforms Ireland Limited",
    aliases: ["meta llama", "llama api", "llama", "llama 3", "llama 4"],
    productCatalog: ["Llama API", "Llama Guard"],
    serviceCategory: "AI/LLM",
    vendorRegion: "US",
    defaultRole: "processor",
    knownSubprocessors: ["Meta data centers"],
    defaultTransferMechanism: "scc_controller_processor",
    defaultDpaStatus: "missing",
    defaultSecurityEvidence: {
      soc2: true,
      encryptionInTransit: true,
      encryptionAtRest: true,
    },
    defaultAITerms: {
      trainingDataOptOut: "unknown",
      inputDataRetention: "unknown",
      outputRightsOwnership: "client",
      modelTransparency: "documented",
      reproducibilityGuarantees: false,
    },
    defaultRiskLevel: "high",
    complianceNote:
      "Modelul Llama e open-weight, dar API hostat Meta. Verifica termenii API separat de licenta modelului. DPA explicit ceruta.",
  },
  // ═══ 8. Cohere ═══
  {
    id: "cohere",
    canonicalName: "Cohere",
    legalEntity: "Cohere Inc.",
    aliases: ["cohere"],
    productCatalog: ["Cohere Command", "Cohere Embed", "Cohere Rerank"],
    serviceCategory: "AI/LLM",
    vendorRegion: "US",
    defaultRole: "processor",
    knownDpaUrl: "https://cohere.com/terms/data-processing-agreement",
    knownSubprocessors: ["Google Cloud Platform", "Amazon Web Services", "Oracle Cloud"],
    defaultTransferMechanism: "scc_controller_processor",
    defaultDpaStatus: "missing",
    defaultSecurityEvidence: {
      soc2: true,
      iso27001: true,
      encryptionInTransit: true,
      encryptionAtRest: true,
    },
    defaultAITerms: {
      trainingDataOptOut: "default_opt_out",
      inputDataRetention: "no_retention",
      outputRightsOwnership: "client",
      modelTransparency: "partial",
      reproducibilityGuarantees: false,
    },
    defaultRiskLevel: "medium",
    complianceNote:
      "API enterprise zero retention default. Verifica regiunea hosting (US/EU/Canada).",
  },
  // ═══ 9. AWS Bedrock ═══
  {
    id: "aws-bedrock",
    canonicalName: "AWS Bedrock",
    legalEntity: "Amazon Web Services EMEA SARL",
    aliases: ["bedrock", "aws bedrock", "amazon bedrock"],
    productCatalog: ["Amazon Bedrock", "Bedrock Agents", "Bedrock Knowledge Bases"],
    serviceCategory: "AI/LLM Platform",
    vendorRegion: "EU",
    defaultRole: "processor",
    knownDpaUrl: "https://aws.amazon.com/compliance/data-processing-addendum/",
    knownSubprocessorsUrl: "https://aws.amazon.com/compliance/sub-processors/",
    knownSubprocessors: ["AWS data center subprocessors"],
    defaultTransferMechanism: "scc_controller_processor",
    defaultDpaStatus: "missing",
    defaultSecurityEvidence: {
      iso27001: true,
      soc2: true,
      encryptionInTransit: true,
      encryptionAtRest: true,
      mfaEnforced: true,
      auditLogsAvailable: true,
      penTestRecent: true,
    },
    defaultAITerms: {
      trainingDataOptOut: "yes",
      inputDataRetention: "no_retention",
      outputRightsOwnership: "client",
      modelTransparency: "partial",
      reproducibilityGuarantees: false,
    },
    defaultRiskLevel: "medium",
    complianceNote:
      "Platforma agregator (acceseaza Claude, Llama, Mistral, Titan). DPA AWS acopera, dar modelele upstream pot avea termeni separati.",
  },
  // ═══ 10. IBM watsonx ═══
  {
    id: "ibm-watsonx",
    canonicalName: "IBM watsonx",
    legalEntity: "IBM Ireland Product Distribution Limited",
    aliases: ["watsonx", "ibm watsonx", "ibm watson", "watson assistant"],
    productCatalog: ["watsonx.ai", "watsonx.data", "watsonx.governance"],
    serviceCategory: "AI/LLM Platform",
    vendorRegion: "EU",
    defaultRole: "processor",
    knownDpaUrl: "https://www.ibm.com/support/customer/csol/terms/?id=Z126-7870",
    knownSubprocessors: ["IBM Cloud", "IBM data center subprocessors"],
    defaultTransferMechanism: "scc_controller_processor",
    defaultDpaStatus: "missing",
    defaultSecurityEvidence: {
      iso27001: true,
      soc2: true,
      encryptionInTransit: true,
      encryptionAtRest: true,
      auditLogsAvailable: true,
    },
    defaultAITerms: {
      trainingDataOptOut: "yes",
      inputDataRetention: "no_retention",
      outputRightsOwnership: "client",
      modelTransparency: "documented",
      reproducibilityGuarantees: true,
    },
    defaultRiskLevel: "low",
    complianceNote:
      "Vendor enterprise cu hostare EU disponibila (Frankfurt, Madrid). Promite reproducibility prin model snapshots.",
  },
  // ═══ 11. Hugging Face ═══
  {
    id: "huggingface",
    canonicalName: "Hugging Face",
    legalEntity: "Hugging Face Inc.",
    aliases: ["hugging face", "huggingface", "hf", "hf hub"],
    productCatalog: ["Inference API", "Inference Endpoints", "Spaces", "AutoTrain"],
    serviceCategory: "AI/Model Hub",
    vendorRegion: "US",
    defaultRole: "processor",
    knownDpaUrl: "https://huggingface.co/terms-of-service",
    knownSubprocessors: ["Amazon Web Services", "Microsoft Azure", "Google Cloud"],
    defaultTransferMechanism: "scc_controller_processor",
    defaultDpaStatus: "missing",
    defaultSecurityEvidence: {
      soc2: true,
      encryptionInTransit: true,
      encryptionAtRest: true,
    },
    defaultAITerms: {
      trainingDataOptOut: "yes",
      inputDataRetention: "no_retention",
      outputRightsOwnership: "client",
      modelTransparency: "documented",
      reproducibilityGuarantees: true,
    },
    defaultRiskLevel: "medium",
    complianceNote:
      "Hub-ul gazduieste modele third-party — verifica licenta fiecarui model separat. Pentru inference endpoints, alege regiune EU.",
  },
  // ═══ 12. ElevenLabs — AI voice ═══
  {
    id: "elevenlabs",
    canonicalName: "ElevenLabs",
    legalEntity: "ElevenLabs Inc.",
    aliases: ["elevenlabs", "eleven labs", "11labs"],
    productCatalog: ["Text-to-Speech API", "Voice Cloning", "Dubbing"],
    serviceCategory: "AI/Voice",
    vendorRegion: "US",
    defaultRole: "processor",
    knownDpaUrl: "https://elevenlabs.io/dpa",
    knownSubprocessors: ["Amazon Web Services", "Cloudflare", "Stripe"],
    defaultTransferMechanism: "scc_controller_processor",
    defaultDpaStatus: "missing",
    defaultSecurityEvidence: {
      soc2: true,
      encryptionInTransit: true,
      encryptionAtRest: true,
    },
    defaultAITerms: {
      trainingDataOptOut: "yes",
      inputDataRetention: "days_30",
      outputRightsOwnership: "client",
      modelTransparency: "partial",
      reproducibilityGuarantees: false,
    },
    defaultRiskLevel: "high",
    complianceNote:
      "Voice cloning = date biometrice (Art. 9 GDPR). Necesita consimtamant explicit + DPIA daca folosit pentru deepfake voice. AI Act Art. 50 — disclosure obligatorie.",
  },
  // ═══ 13. Synthesia — AI video ═══
  {
    id: "synthesia",
    canonicalName: "Synthesia",
    legalEntity: "Synthesia Limited",
    aliases: ["synthesia", "synthesia.io"],
    productCatalog: ["Synthesia Studio", "Synthesia API"],
    serviceCategory: "AI/Video",
    vendorRegion: "UK",
    defaultRole: "processor",
    knownDpaUrl: "https://www.synthesia.io/data-processing-agreement",
    knownSubprocessors: ["Amazon Web Services", "Cloudflare"],
    defaultTransferMechanism: "adequacy_decision",
    defaultDpaStatus: "missing",
    defaultSecurityEvidence: {
      iso27001: true,
      soc2: true,
      encryptionInTransit: true,
      encryptionAtRest: true,
    },
    defaultAITerms: {
      trainingDataOptOut: "yes",
      inputDataRetention: "session_only",
      outputRightsOwnership: "client",
      modelTransparency: "partial",
      reproducibilityGuarantees: false,
    },
    defaultRiskLevel: "high",
    complianceNote:
      "AI avatars = continut sintetic. AI Act Art. 50 — disclosure deepfake obligatorie. UK adequacy decision aplicabil.",
  },
  // ═══ 14. Pinecone — vector DB ═══
  {
    id: "pinecone",
    canonicalName: "Pinecone",
    legalEntity: "Pinecone Systems Inc.",
    aliases: ["pinecone", "pinecone.io"],
    productCatalog: ["Pinecone Serverless", "Pinecone Pods"],
    serviceCategory: "AI/Vector DB",
    vendorRegion: "US",
    defaultRole: "processor",
    knownDpaUrl: "https://www.pinecone.io/legal/dpa/",
    knownSubprocessors: ["Amazon Web Services", "Google Cloud Platform", "Microsoft Azure"],
    defaultTransferMechanism: "scc_controller_processor",
    defaultDpaStatus: "missing",
    defaultSecurityEvidence: {
      soc2: true,
      encryptionInTransit: true,
      encryptionAtRest: true,
      auditLogsAvailable: true,
    },
    defaultAITerms: {
      trainingDataOptOut: "yes",
      inputDataRetention: "indefinite",
      outputRightsOwnership: "client",
      modelTransparency: "documented",
      reproducibilityGuarantees: true,
    },
    defaultRiskLevel: "medium",
    complianceNote:
      "Stocheaza embeddings — pot reconstrui PII din embeddings (Art. 4 GDPR). Alege regiune EU si activeaza encryption customer-managed.",
  },
  // ═══ 15. Weaviate — vector DB ═══
  {
    id: "weaviate",
    canonicalName: "Weaviate",
    legalEntity: "Weaviate B.V.",
    aliases: ["weaviate"],
    productCatalog: ["Weaviate Cloud", "Weaviate Serverless"],
    serviceCategory: "AI/Vector DB",
    vendorRegion: "EU",
    defaultRole: "processor",
    knownDpaUrl: "https://weaviate.io/service/data-processing-agreement",
    knownSubprocessors: ["Google Cloud Platform", "Amazon Web Services"],
    defaultTransferMechanism: "adequacy_decision",
    defaultDpaStatus: "missing",
    defaultSecurityEvidence: {
      soc2: true,
      encryptionInTransit: true,
      encryptionAtRest: true,
    },
    defaultAITerms: {
      trainingDataOptOut: "yes",
      inputDataRetention: "indefinite",
      outputRightsOwnership: "client",
      modelTransparency: "documented",
      reproducibilityGuarantees: true,
    },
    defaultRiskLevel: "low",
    complianceNote:
      "Vendor olandez — hostare in EU disponibila. Open-source self-hosted alternativa pentru control complet.",
  },
  // ═══ 16. Replicate — model API ═══
  {
    id: "replicate",
    canonicalName: "Replicate",
    legalEntity: "Replicate, Inc.",
    aliases: ["replicate"],
    productCatalog: ["Replicate API", "Replicate Cog"],
    serviceCategory: "AI/Model Hub",
    vendorRegion: "US",
    defaultRole: "processor",
    knownDpaUrl: "https://replicate.com/terms",
    knownSubprocessors: ["Google Cloud Platform", "Amazon Web Services", "CoreWeave"],
    defaultTransferMechanism: "scc_controller_processor",
    defaultDpaStatus: "missing",
    defaultSecurityEvidence: {
      encryptionInTransit: true,
      encryptionAtRest: true,
    },
    defaultAITerms: {
      trainingDataOptOut: "unknown",
      inputDataRetention: "session_only",
      outputRightsOwnership: "client",
      modelTransparency: "documented",
      reproducibilityGuarantees: true,
    },
    defaultRiskLevel: "medium",
    complianceNote:
      "Aggregator de modele third-party. Verifica termenii fiecarui model separat. NU folosi pentru date sensibile fara DPA explicit.",
  },
  // ═══ 17. Stability AI ═══
  {
    id: "stability-ai",
    canonicalName: "Stability AI",
    legalEntity: "Stability AI Ltd",
    aliases: ["stability ai", "stability", "stable diffusion api", "stable diffusion 3"],
    productCatalog: ["Stable Diffusion API", "Stable Video Diffusion"],
    serviceCategory: "AI/Image",
    vendorRegion: "UK",
    defaultRole: "processor",
    knownDpaUrl: "https://stability.ai/data-processing-agreement",
    knownSubprocessors: ["Amazon Web Services"],
    defaultTransferMechanism: "adequacy_decision",
    defaultDpaStatus: "missing",
    defaultSecurityEvidence: {
      encryptionInTransit: true,
      encryptionAtRest: true,
    },
    defaultAITerms: {
      trainingDataOptOut: "yes",
      inputDataRetention: "session_only",
      outputRightsOwnership: "client",
      modelTransparency: "documented",
      reproducibilityGuarantees: false,
    },
    defaultRiskLevel: "medium",
    complianceNote:
      "Generare imagini = AI Act Art. 50 (continut sintetic). Verifica daca permite generare deepfake/intim — restrictii contractuale necesare.",
  },
]

// ── Lookup helpers ───────────────────────────────────────────────────────────

/**
 * Cauta in library by id sau alias (case-insensitive).
 */
export function findVendorInLibrary(query: string): VendorLibraryEntry | null {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return null
  for (const entry of VENDOR_LIBRARY) {
    if (entry.id === normalized) return entry
    if (entry.canonicalName.toLowerCase() === normalized) return entry
    if (entry.aliases.includes(normalized)) return entry
  }
  return null
}

/**
 * Search fuzzy by partial match — folosit pentru autocomplete UI.
 */
export function searchVendorLibrary(query: string, limit = 10): VendorLibraryEntry[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return VENDOR_LIBRARY.slice(0, limit)
  const results: VendorLibraryEntry[] = []
  for (const entry of VENDOR_LIBRARY) {
    if (entry.id.includes(normalized)) {
      results.push(entry)
      continue
    }
    if (entry.canonicalName.toLowerCase().includes(normalized)) {
      results.push(entry)
      continue
    }
    if (entry.aliases.some((a) => a.includes(normalized))) {
      results.push(entry)
      continue
    }
  }
  return results.slice(0, limit)
}

/**
 * Returneaza intregul catalog (pentru API /api/vendor-review/library).
 */
export function listVendorLibrary(): VendorLibraryEntry[] {
  return VENDOR_LIBRARY.slice()
}

/**
 * Helper pentru a obtine label categorie servicii unice.
 */
export function listVendorCategories(): string[] {
  return Array.from(new Set(VENDOR_LIBRARY.map((e) => e.serviceCategory))).sort()
}

/**
 * Construieste un VendorRecord draft din library entry — folosit de
 * vendor-prefill (Sprint 010-4). Toate campurile lipsa sunt default safe.
 *
 * NU persista — caller-ul ataseaza id, orgId, timestamps.
 */
export function buildVendorDraftFromLibrary(
  entry: VendorLibraryEntry,
): Omit<VendorRecord, "id" | "orgId" | "createdAtISO" | "updatedAtISO"> {
  const aiTerms: VendorAITerms = {
    trainingDataOptOut: entry.defaultAITerms.trainingDataOptOut ?? "unknown",
    inputDataRetention: entry.defaultAITerms.inputDataRetention ?? "unknown",
    outputRightsOwnership: entry.defaultAITerms.outputRightsOwnership ?? "unknown",
    modelTransparency: entry.defaultAITerms.modelTransparency ?? "unknown",
    reproducibilityGuarantees: entry.defaultAITerms.reproducibilityGuarantees ?? false,
  }
  const security: VendorSecurityEvidence = {
    iso27001: entry.defaultSecurityEvidence.iso27001 ?? false,
    soc2: entry.defaultSecurityEvidence.soc2 ?? false,
    penTestRecent: entry.defaultSecurityEvidence.penTestRecent ?? false,
    encryptionInTransit: entry.defaultSecurityEvidence.encryptionInTransit ?? false,
    encryptionAtRest: entry.defaultSecurityEvidence.encryptionAtRest ?? false,
    mfaEnforced: entry.defaultSecurityEvidence.mfaEnforced ?? false,
    auditLogsAvailable: entry.defaultSecurityEvidence.auditLogsAvailable ?? false,
    incidentNotificationCommitmentHours:
      entry.defaultSecurityEvidence.incidentNotificationCommitmentHours,
  }

  return {
    name: entry.canonicalName,
    legalEntity: entry.legalEntity,
    productUsed: entry.productCatalog[0] ?? "",
    vendorRegion: entry.vendorRegion,
    role: entry.defaultRole,
    serviceCategory: entry.serviceCategory,
    linkedAISystemIds: [],
    linkedAIDataMapIds: [],
    dpaStatus: entry.defaultDpaStatus,
    dpaUrl: entry.knownDpaUrl,
    transferRequired: entry.vendorRegion !== "EU",
    transferMechanism: entry.defaultTransferMechanism,
    subprocessorsList: entry.knownSubprocessors.slice(),
    subprocessorsUrl: entry.knownSubprocessorsUrl,
    securityEvidence: security,
    aiTerms,
    riskLevel: entry.defaultRiskLevel,
    riskReasons: [`Baseline din library catalog: ${entry.complianceNote}`],
    reviewStatus: "draft",
    humanReviewRequired: entry.defaultRiskLevel === "high" || entry.defaultRiskLevel === "critical",
    linkedFindingIds: [],
    notes: entry.complianceNote,
  }
}
