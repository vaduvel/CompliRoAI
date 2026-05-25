# CompliRoAI AI Guidance Orchestrator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the mature AI work-plan layer for CompliRoAI: a role-aware, evidence-aware, audit-ready orchestration cockpit that tells the user exactly what to do next without inventing law or replacing deterministic compliance engines.

**Architecture:** Deterministic compliance modules remain the source of truth: Compliance Gate, findings, Preventive Engine, AI project inventory, AI Act coverage matrix, GDPR/DPIA/RoPA/vendor modules. The AI Guidance Orchestrator reads that state, ranks actions, explains reasoning, generates an auditable plan, tracks plan history, and optionally uses Mistral only to phrase explanations without changing legal references, verdicts, priorities, or action IDs.

**Tech Stack:** Next.js 15 App Router, TypeScript, Vitest, existing `ComplianceState`, existing hash-chained `ComplianceEvent`, existing Audit Pack builder, optional Mistral API via server-only composer, Vercel deployment.

---

## 0. Non-Negotiable Rules

- [ ] **No legal hallucination:** The orchestrator must not create new legal obligations, articles, deadlines, or verdicts. It can only cite references already present in deterministic modules, coverage matrix, findings, preventive rules, or approved obligation templates.
- [ ] **AI does not execute:** The plan can recommend, explain, prioritize, and deep-link. It never closes findings, marks evidence as accepted, sends emails, or changes legal status without explicit user action.
- [ ] **Deterministic first:** If Mistral is unavailable, disabled, or returns unsafe output, the product must still work with deterministic guidance.
- [ ] **Romanian-first UI:** All user-facing UI copy stays in Romanian. English labels are allowed only where the domain term is standard, for example `AI Builder`, `API / SDK`, `Audit Pack`.
- [ ] **Role-aware workspace:** IMM, AI Builder, and Cabinet see the same product intelligence through different workflow views. Do not build vertical-specific products.
- [ ] **No unrelated frameworks:** Do not port Fiscal, Whistleblowing, Pay Transparency, full NIS2, or full DORA. Only AI Act, GDPR AI-related, vendor AI, DORA AI slice, NIS2 AI slice if already present.
- [ ] **Production-level only:** No `demo`, `mock`, `MVP`, `placeholder`, or fake legal labels in production UI.

---

## 1. Current Implementation Baseline

These files already exist locally and must be treated as the starting point:

- `lib/compliance/ai-project-foundation.ts`
- `lib/compliance/guidance-orchestrator.ts`
- `lib/compliance/guidance-orchestrator.test.ts`

The current pure engine already covers:

- AI project profile normalization: stage, role, risk, owner, evidence gaps.
- Obligation templates mapped by role and risk.
- Guidance plan generation from findings, preventive actions, AI project obligations, and role steps.
- Omitted-actions explanation.
- Plan diff between old and current plan.
- Deterministic guardrails.

Before implementation continues, run:

```bash
npx vitest run lib/compliance/guidance-orchestrator.test.ts
```

Expected result:

```text
PASS lib/compliance/guidance-orchestrator.test.ts
```

---

## 2. Product Scope Locked For This Sprint

### 2.1 PwC/Czech-style AI compliance platform parity

We must visibly cover these product capabilities:

- [ ] AI project inventory per org/client.
- [ ] Risk profile per AI project.
- [ ] Stage/status: `planned`, `pilot`, `live`, `retired`.
- [ ] AI Act role: `provider`, `deployer`, `importer`, `distributor`, `manufacturer`.
- [ ] Task ownership: `DPO`, `Legal`, `IT`, `Product`, `Management`, `Security`, `Marketing`, `Cabinet`.
- [ ] Audit trail for plan generation, plan acceptance, user actions, and evidence state.
- [ ] Evidence required per obligation.
- [ ] Tailored guidance per role + risk.
- [ ] Templates per obligation.
- [ ] Audit Pack export of current plan, plan history, AI project profiles, and obligation templates.

### 2.2 Claude Design orchestrator feedback

These are required:

- [ ] AI Guidance regenerates after action-state changes. Example: if item 1 is resolved, the next plan no longer ranks it as item 1.
- [ ] User can inspect “De ce AI a omis X?” for candidates not shown in the short plan.
- [ ] User can compare plan history: previous plan vs current plan, including added, removed, and reprioritized actions.
- [ ] The short plan appears as a premium work-plan card on dashboard.
- [ ] “Plan complet” opens an explanation drawer with legal references, source matrix, owner, target route, and action rationale.
- [ ] Drawer footer includes “Respinge tot planul”, “Export plan”, and “Acceptă & prioritizează”.

### 2.3 Skillab / market feedback to include

The Skillab course confirms demand around these topics:

- AI Act and legal framework.
- GDPR and AI-related data protection.
- Contracts and liability in AI projects.
- Governance and internal controls.
- AI cybersecurity and data used for training/operation.
- Roles for lawyers, compliance professionals, CTO/CIO.

Implementation impact:

- [ ] Add `Contracte și răspundere AI` as guidance/template content under Vendor AI Assessment, not as a separate framework.
- [ ] Add evidence requirements for AI contracts: DPA, liability clause, audit rights, IP/training data clause, sub-processor list, incident notification, security schedule.
- [ ] Ensure orchestrator can recommend contract review when an AI vendor or AI builder project lacks evidence.

---

## 3. File Structure

### Existing files to modify

- `app/dashboard/page.tsx`: render the guidance work-plan panel above classic counters/next steps.
- `lib/server/audit-pack-builder.ts`: export guidance plan files into Audit Pack.
- `lib/compliance/ai-project-foundation.ts`: add contract/liability obligation template if missing.
- `lib/compliance/guidance-orchestrator.ts`: keep deterministic plan builder; extend only if tests require.
- `lib/compliance/guidance-orchestrator.test.ts`: keep pure-engine regression tests.

### New files to create

- `lib/server/guidance-plan-store.ts`: read/generate/save guidance plan snapshots and append hash-chained events.
- `lib/server/guidance-plan-store.test.ts`: persistence, diff, and audit-event tests.
- `app/api/guidance/plan/route.ts`: GET current plan and POST accepted/regenerated plan.
- `components/ai-act/guidance-plan-panel.tsx`: dashboard card + complete-plan drawer.
- `components/ai-act/guidance-plan-panel.test.tsx` only if the repo already supports component tests; otherwise cover behavior through store/API tests and build.
- `lib/server/guidance-ai-composer.ts`: optional Mistral phrasing layer with strict validation and deterministic fallback.
- `lib/server/guidance-ai-composer.test.ts`: validates that composer cannot alter action IDs, legal references, priorities, or target routes.

### Sprint documentation

- `docs/sprints/sprint-027-ai-guidance-orchestrator.md`: sprint log after implementation.

---

## 4. Task 1: Lock The Pure Orchestrator Baseline

**Files:**

- Test: `lib/compliance/guidance-orchestrator.test.ts`
- Existing implementation: `lib/compliance/guidance-orchestrator.ts`
- Existing foundation: `lib/compliance/ai-project-foundation.ts`

- [ ] **Step 1: Run current pure engine tests**

```bash
npx vitest run lib/compliance/guidance-orchestrator.test.ts
```

Expected:

```text
PASS lib/compliance/guidance-orchestrator.test.ts
```

- [ ] **Step 2: If tests fail, fix only the pure orchestrator**

Allowed files:

```text
lib/compliance/guidance-orchestrator.ts
lib/compliance/ai-project-foundation.ts
lib/compliance/guidance-orchestrator.test.ts
```

Do not modify dashboard/UI/API until this test is green.

- [ ] **Step 3: Confirm no unrelated framework leak**

```bash
rg -n "e-Factura|ANAF|Whistleblowing|Pay Transparency|REGES" lib/compliance/guidance-orchestrator.ts lib/compliance/ai-project-foundation.ts
```

Expected:

```text
no matches
```

---

## 5. Task 2: Guidance Plan Store With Audit History

**Files:**

- Create: `lib/server/guidance-plan-store.ts`
- Create: `lib/server/guidance-plan-store.test.ts`
- Uses: `lib/server/store.ts`
- Uses: `lib/compliance/events.ts`
- Uses: `lib/compliance/guidance-orchestrator.ts`

- [ ] **Step 1: Write failing persistence test**

Create `lib/server/guidance-plan-store.test.ts` with tests for:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

import { initialComplianceState } from "@/lib/compliance/engine"
import type { ComplianceState, ScanFinding } from "@/lib/compliance/types"
import {
  readGuidancePlan,
  saveGuidancePlanSnapshot,
} from "./guidance-plan-store"

const NOW = "2026-05-19T10:00:00.000Z"

vi.mock("./org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-test",
    userId: "user-test",
    email: "dpo@example.ro",
    orgName: "Apex Logistic SRL",
    workspaceMode: "cabinet",
  })),
}))

let state: ComplianceState & { guidancePlanSnapshots?: unknown[] }

vi.mock("./fs-safe", () => ({
  safeReadJson: vi.fn(async () => state),
  safeWriteJson: vi.fn(async (_path: string, next: ComplianceState) => {
    state = next
  }),
}))

function finding(overrides: Partial<ScanFinding> = {}): ScanFinding {
  return {
    id: "dpia-001",
    title: "Semnează DPIA-001 ChatGPT Team",
    detail: "DPIA lipsește pentru sistem AI cu date personale.",
    category: "GDPR",
    severity: "critical",
    risk: "high",
    principles: ["privacy_data_governance"],
    sourceDocument: "DPIA",
    createdAtISO: NOW,
    findingStatus: "open",
    legalReference: "GDPR Art. 35",
    evidenceRequired: "DPIA semnată",
    ownerSuggestion: "DPO",
    remediationHint: "Finalizează DPIA.",
    ...overrides,
  }
}

describe("guidance-plan-store", () => {
  beforeEach(() => {
    state = {
      ...structuredClone(initialComplianceState),
      findings: [finding()],
    }
  })

  it("salvează snapshot-ul planului și eveniment auditabil", async () => {
    const result = await saveGuidancePlanSnapshot("org-test", {
      workspaceMode: "cabinet",
      orgName: "Apex Logistic SRL",
      nowISO: NOW,
    })

    expect(result.snapshot.fingerprint).toBe(result.plan.fingerprint)
    expect(state.guidancePlanSnapshots).toHaveLength(1)
    expect(state.events.some((event) => event.type === "guidance.plan.generated")).toBe(true)
  })

  it("compară planul curent cu ultimul snapshot după rezolvarea unui finding", async () => {
    await saveGuidancePlanSnapshot("org-test", {
      workspaceMode: "cabinet",
      orgName: "Apex Logistic SRL",
      nowISO: NOW,
    })

    state.findings = [finding({ findingStatus: "resolved" })]

    const current = await readGuidancePlan("org-test", {
      workspaceMode: "cabinet",
      orgName: "Apex Logistic SRL",
      nowISO: "2026-05-19T11:00:00.000Z",
    })

    expect(current.diff?.removed.some((action) => action.id.includes("dpia-001"))).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails because store does not exist**

```bash
npx vitest run lib/server/guidance-plan-store.test.ts
```

Expected:

```text
FAIL Cannot find module './guidance-plan-store'
```

- [ ] **Step 3: Implement `guidance-plan-store.ts`**

Required exports:

```ts
export type GuidancePlanSnapshot = {
  id: string
  plan: GuidancePlan
  generatedAtISO: string
  fingerprint: string
  acceptedAtISO?: string
  acceptedByEmail?: string
}

export async function readGuidancePlan(...)
export async function saveGuidancePlanSnapshot(...)
export function buildGuidanceMarkdown(...)
```

Implementation rules:

- Use `readState` for read-only current plan.
- Use `mutateFreshStateForOrg` for saving snapshots.
- Store snapshots in `state.guidancePlanSnapshots` without adding a full `ComplianceState` type migration yet; use an extended local type.
- Cap history to 20 snapshots.
- Append a `ComplianceEvent` with:

```ts
type: "guidance.plan.generated"
entityType: "system"
entityId: plan.id
message: `Plan de lucru AI generat: ${plan.actions.length} acțiuni prioritare.`
```

- [ ] **Step 4: Run store tests**

```bash
npx vitest run lib/server/guidance-plan-store.test.ts
```

Expected:

```text
PASS lib/server/guidance-plan-store.test.ts
```

---

## 6. Task 3: Guidance Plan API

**Files:**

- Create: `app/api/guidance/plan/route.ts`
- Test through build and API health checks.

- [ ] **Step 1: Implement GET and POST**

Route behavior:

- `GET /api/guidance/plan`: returns current computed plan, latest snapshot, diff.
- `POST /api/guidance/plan`: saves snapshot and returns persisted snapshot, current plan, diff.

Server context:

```ts
const ctx = await getOrgContext()
```

Workspace:

```ts
const workspaceMode = normalizeWorkspaceMode(ctx.workspaceMode)
const orgName = ctx.orgName
```

Response shape:

```ts
{
  ok: true,
  plan,
  diff,
  latestSnapshot,
}
```

Error response:

```ts
{
  ok: false,
  error: "Nu am putut genera planul de lucru AI."
}
```

- [ ] **Step 2: Verify route compiles**

```bash
npx tsc --noEmit
```

Expected:

```text
0 errors
```

---

## 7. Task 4: Dashboard Guidance Card + Complete Plan Drawer

**Files:**

- Create: `components/ai-act/guidance-plan-panel.tsx`
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Create client component**

Component props:

```ts
type GuidancePlanPanelProps = {
  initialPlan: GuidancePlan
  initialDiff: GuidancePlanDiff | null
}
```

Required UI:

- Header: `Plan de lucru AI · azi`
- Badge: `AI · DETERMINIST` or `AI · MISTRAL`
- Metadata: generated time, number of AI systems, number of legal references.
- Top actions: `Regenerază`, `Plan complet`.
- Action list:
  - rank circle
  - title
  - why
  - legal reference badges
  - suggested owner
  - suggested target
  - `Deschide` link
- Footer guardrail:

```text
AI nu execută · doar recomandă · salvat în jurnal audit cu surse
```

Drawer content:

- `Plan de lucru AI · explicat`
- How it works:

```text
Citește state-ul aplicației: sisteme AI, findings, deadline-uri, evidence.
Caută în AI Act coverage, Preventive Engine și findings.
Ordonează după impact legal real.
AI-ul nu execută — recomandă.
```

- Detailed card per action:
  - `De ce e #N`
  - `Articole consultate`
  - `Cine ar trebui să facă`
  - `Unde apeși în aplicație`
- Omitted candidates section:
  - title: `De ce nu sunt și celelalte în planul scurt?`
  - list omitted actions with `omittedReason`
- Diff section:
  - title: `Ce s-a schimbat față de ultimul plan`
  - added/removed/reprioritized counts
- Footer buttons:
  - `Respinge tot planul`
  - `Export plan`
  - `Acceptă & prioritizează`

- [ ] **Step 2: Wire regeneration**

`Regenerază` and `Acceptă & prioritizează` call:

```ts
await fetch("/api/guidance/plan", { method: "POST" })
```

Then update local state with returned `plan` and `diff`.

- [ ] **Step 3: Modify dashboard**

In `app/dashboard/page.tsx`:

- read state once
- call `readGuidancePlan`
- render `GuidancePlanPanel` above counters
- keep old “Următorii 3 pași” as fallback when state read fails

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit
npm run build
```

Expected:

```text
0 TypeScript errors
Compiled successfully
```

---

## 8. Task 5: Audit Pack Integration

**Files:**

- Modify: `lib/server/audit-pack-builder.ts`
- Uses: `lib/server/guidance-plan-store.ts`
- Uses: `lib/compliance/ai-project-foundation.ts`

- [ ] **Step 1: Add guidance export helper**

Add files under:

```text
guidance/current-plan.json
guidance/latest-plan.md
guidance/project-profiles.json
guidance/obligation-templates.md
```

If snapshots exist, add:

```text
guidance/history.json
```

- [ ] **Step 2: Ensure no full API tokens or secrets**

Run:

```bash
rg -n "MISTRAL_API_KEY|RESEND_API_KEY|SUPABASE_SERVICE_ROLE|cra_[a-f0-9]{32}" lib/server/audit-pack-builder.ts
```

Expected:

```text
no matches
```

- [ ] **Step 3: Run targeted Audit Pack tests**

Find audit pack tests:

```bash
rg -n "audit pack|audit-pack|buildAudit" lib app tests
```

Run the relevant test file. If there is no direct test, run:

```bash
npx tsc --noEmit
npm run build
```

---

## 9. Task 6: Mistral Composer With Deterministic Guardrails

**Files:**

- Create: `lib/server/guidance-ai-composer.ts`
- Create: `lib/server/guidance-ai-composer.test.ts`

This is not a legal engine. It is a phrasing layer.

- [ ] **Step 1: Write failing safety test**

The test must prove that a malicious/incorrect model response cannot change:

- action ID
- rank
- legal references
- priority
- target route
- source IDs

Expected behavior:

```ts
expect(composed.actions[0].id).toBe(original.actions[0].id)
expect(composed.actions[0].legalReferences).toEqual(original.actions[0].legalReferences)
expect(composed.actions[0].targetHref).toBe(original.actions[0].targetHref)
```

- [ ] **Step 2: Implement deterministic fallback**

If `MISTRAL_API_KEY` is missing:

```ts
return {
  plan,
  modelLabel: "deterministic",
  usedAI: false,
  warnings: ["Mistral indisponibil; folosim plan deterministic."]
}
```

- [ ] **Step 3: Implement safe composer**

Allowed changes from AI:

- `summary`
- `actions[].why`
- `omittedActions[].omittedReason`

Everything else is copied from deterministic plan.

- [ ] **Step 4: Validate composer**

```bash
npx vitest run lib/server/guidance-ai-composer.test.ts
```

Expected:

```text
PASS lib/server/guidance-ai-composer.test.ts
```

---

## 10. Task 7: Contracte & Răspundere AI Template

**Files:**

- Modify: `lib/compliance/ai-project-foundation.ts`
- Modify: `lib/compliance/guidance-orchestrator.test.ts`

- [ ] **Step 1: Add failing test**

Add a test where an AI system uses a vendor and personal data. Expect at least one template/action with:

```text
Contracte și răspundere AI
```

Evidence must include:

```text
DPA
clauză răspundere
drept audit
date training
sub-procesatori
notificare incident
securitate
```

- [ ] **Step 2: Implement obligation template**

Template:

```ts
{
  id: "ai-contract-liability",
  article: "GDPR Art. 28 + AI Act Art. 25/26",
  title: "Contracte și răspundere AI",
  ownerRole: "Legal",
  targetHref: "/dashboard/vendor-review",
  evidenceRequired: [
    "DPA",
    "clauză răspundere",
    "drept audit",
    "clauză date training",
    "sub-procesatori",
    "notificare incident",
    "anexă securitate",
  ],
}
```

- [ ] **Step 3: Run pure orchestrator tests**

```bash
npx vitest run lib/compliance/guidance-orchestrator.test.ts
```

Expected:

```text
PASS
```

---

## 11. Task 8: Production QA

Run the full validation suite:

```bash
npx vitest run lib/compliance/guidance-orchestrator.test.ts lib/server/guidance-plan-store.test.ts lib/server/guidance-ai-composer.test.ts
npx tsc --noEmit
npm run build
```

Expected:

```text
all targeted tests pass
0 TypeScript errors
build clean
```

Then scan for forbidden production copy:

```bash
rg -n "demo|mock|MVP|placeholder|coming soon|e-Factura|ANAF|Whistleblowing|Pay Transparency|REGES" app components lib --glob '!**/*.test.ts'
```

Expected:

```text
no production hits except explicit legacy defensive comments, if any
```

If hits exist, either remove them or document why they are not visible to users.

---

## 12. Claude Design Feedback Intake

### 12.1 Feedback received 2026-05-19 — Skillab curriculum alignment

Claude Design extracted the following buyer questions from Skillab's AI law curriculum. This is market validation, not a reason to split the product architecture.

Skillab teaches:

- AI Act and legal framework: how AI works, AI Act vs UK/US/China, developer/provider/user obligations, risk classification.
- Contracts and liability: AI clauses, legal risk, liability limits, civil/criminal liability chain, consumer protection, algorithmic discrimination, regulated industries such as fintech, insuretech, medtech, legal.
- Governance and internal control: internal policies, risk assessments, control mechanisms for legal AI adoption.

CompliRoAI product mapping:

| Skillab teaches | CompliRoAI delivers |
| --- | --- |
| "How to classify AI systems" | Role Classifier + Risk Engine + Compliance Gate |
| "Developer/provider/user obligations" | Role Assessment + AI Act obligations per role |
| "AI contracts and liability" | Vendor AI Assessment + DPA + contract/liability guidance |
| "Risks in fintech/medtech/legal" | AI Vendor Assessment + DORA/NIS2 AI slices + risk overlays |
| "Internal policies" | AI Usage Policy + QMS templates + AI Literacy |
| "Risk assessment" | DPIA + FRIA + Conformity Assessment |
| "Control mechanisms" | Human Oversight + Logging Art. 12 + Audit Log + Preventive Engine |

Positioning consequence:

- Skillab sells theory and education.
- CompliRoAI sells execution and evidence.
- Good message for landing/deck: `Skillab te învață ce trebuie să faci. CompliRoAI îți dă workspace-ul în care faci efectiv dosarul, dovezile și audit trail-ul.`

### 12.2 Persona/workspace decision — locked

Do **not** split the product into more operational workspaces because of Skillab personas.

Skillab sells to human personas:

- Avocat
- Profesionist în conformitate / DPO
- CTO & CIO

CompliRoAI operates by workflow/workspace:

- `cabinet`
- `imm-classic`
- `ai-builder`

These are compatible because persona and workspace are different abstraction levels.

Canonical mapping:

| Human persona | CompliRoAI workspace | Why |
| --- | --- | --- |
| Avocat tech/privacy | `cabinet` | Delivers legal/compliance advice to clients; needs client workspaces, white-label, contracts, DPA, Audit Pack |
| DPO extern / consultant compliance | `cabinet` | Manages multiple clients; needs portfolio, Magic Links, findings cockpit, reports |
| DPO intern / compliance officer | `imm-classic` | Implements compliance inside one company; needs inventory, DPIA, RoPA, vendors, evidence |
| CTO/CIO / AI builder | `ai-builder` | Builds or deploys AI systems; needs Annex IV, EU DB, FRIA, QMS, API/SDK |
| IMM owner / management | `imm-classic` | Needs risk view, AI literacy, vendor/transparency actions, not deep legal tooling first |

Locked architecture decision:

- Keep 3 operational workspaces.
- If needed later, add a human-role onboarding question above the workspace mapping.
- Do not create separate technical workspaces for `avocat`, `DPO`, `CTO`, `CIO`, or `IMM owner`.
- Do not create vertical products. HR, fintech, medtech, e-commerce, marketing, legal, public sector, education, and cyber are overlays inside the same product.

Suggested future onboarding layer:

```text
Ce rol ai?
- Avocat tech/privacy
- DPO / compliance
- CTO / CIO / AI builder
- Fondator / management IMM
```

Mapping is internal and invisible:

```text
Avocat tech/privacy -> cabinet
DPO extern -> cabinet
DPO intern -> imm-classic
CTO/CIO/AI builder -> ai-builder
Fondator/management IMM -> imm-classic
```

Welcome copy after onboarding:

```text
Te-am pus în workspace Cabinet pentru că lucrezi ca avocat/consultant pentru mai mulți clienți.
```

or:

```text
Te-am pus în workspace IMM pentru că gestionezi conformarea AI în interiorul unei singure organizații.
```

### 12.3 Product implication for current sprint

Current sprint must not rebuild onboarding. It only needs to ensure the orchestrator can phrase guidance in a way that fits all three workspace modes:

- Cabinet: `lucrezi pentru client`, `pregătește dosarul`, `trimite Magic Link`, `atașează evidence`.
- IMM Classic: `firma ta folosește AI`, `închide obligațiile`, `atașează dovada internă`.
- AI Builder: `sistemul tău AI`, `înainte de lansare`, `Annex IV`, `logging`, `QMS`, `EU Database`.

### 12.3A Market research update — what the orchestrator must prioritize

Latest research conclusion:

- CompliRoAI is already strong for deployer/advisor workflows.
- It is not yet safe to overclaim provider-grade or GPAI-grade completeness until technical evidence modules are deeper.
- The orchestrator must therefore guide users honestly: it can recommend the next best action based on current product evidence, but it must also surface missing provider-grade evidence when relevant.

The orchestrator must rank these gaps above cosmetic or secondary packs when the AI project role/risk requires them:

| Priority | Orchestrator candidate | Legal anchor | Target workspace | Output |
| --- | --- | --- | --- | --- |
| P0 | Build / complete Data & Model Evidence | AI Act Art. 10 + GDPR Art. 5/6/9/25/35 | `ai-builder`, `cabinet`, high-risk `imm-classic` | dataset register, provenance, lawful basis, bias/representativeness, data quality evidence |
| P0 | Add Accuracy / Robustness / Cybersecurity evidence | AI Act Art. 15 | `ai-builder` | metrics, eval plan, robustness/security tests, threshold sign-off |
| P0 | Generate Provider Instructions Pack | AI Act Art. 13 | `ai-builder`, agencies | deployer instructions, limits, misuse warnings, logging/oversight requirements |
| P1 | Generate EU Declaration of Conformity | AI Act Art. 47 + Annex V | high-risk `ai-builder` | declaration, signature, versioning, audit export |
| P1 | Check value-chain / role switch | AI Act Art. 23-25 | agencies, importers, distributors, builders | substantial modification warning, upstream evidence request, CE/doc checks |
| P1 | Prepare explanation response workflow | AI Act Art. 86 + GDPR Art. 22 | HR, credit/scoring, high-impact deployers | explanation intake, draft response, evidence links, approval log |
| P2 | GPAI pack | AI Act Art. 53-55 | future provider tier | downstream information, copyright policy, training-data summary |

Implementation rule:

- Do not let the AI Guidance Orchestrator invent these modules.
- If the module does not exist yet, the orchestrator creates a finding/recommendation that says `evidence module missing` and points to the closest existing workflow.
- Once the module exists, the orchestrator deep-links to the exact page/action.

Copy rule:

```text
Nu avem inca dovada tehnica completa pentru Art. 10/15. Recomandare: creeaza Data & Model Evidence Pack inainte sa promiti provider-grade compliance.
```

This is honest and commercially stronger than pretending the Audit Pack alone covers provider-grade evidence.

### 12.4 General intake rule for future Claude Design feedback

The feedback from Claude Design should be pasted into this section before UI work starts if it changes:

- hierarchy of the dashboard card
- drawer structure
- sidebar IA
- visual density
- light/dark design system
- button labels
- empty states
- mobile behavior

Integration rule:

- If feedback is visual only, apply it in `components/ai-act/guidance-plan-panel.tsx`.
- If feedback changes workflow, update `lib/compliance/guidance-orchestrator.test.ts` first.
- If feedback changes legal behavior, reject it unless it maps to deterministic sources already present in state.

---

## 13. Definition Of Done

The sprint is complete only when all are true:

- [ ] Guidance plan appears on dashboard.
- [ ] Plan short list shows top prioritized actions.
- [ ] Plan drawer explains every visible action.
- [ ] Omitted candidates are visible and explained.
- [ ] Plan diff shows what changed vs previous accepted/generated plan.
- [ ] Regenerate/accept saves a snapshot and audit event.
- [ ] Resolving a finding changes the next generated plan.
- [ ] Audit Pack exports current guidance plan, project profiles, templates, and history.
- [ ] Mistral composer cannot change deterministic legal facts.
- [ ] Contracte & răspundere AI appears as guidance/template when relevant.
- [ ] No Fiscal/Whistleblowing/Pay Transparency leak.
- [ ] `npx tsc --noEmit` passes.
- [ ] Targeted tests pass.
- [ ] `npm run build` passes.

---

## 14. Execution Order

Recommended order:

1. Task 1: lock pure orchestrator tests.
2. Task 2: guidance store + audit snapshots.
3. Task 3: API route.
4. Task 7: contract/liability template while engine is still in focus.
5. Task 4: dashboard card + drawer.
6. Task 5: Audit Pack export.
7. Task 6: Mistral composer guardrails.
8. Task 8: production QA.

Reasoning:

- Store/API must exist before UI can be honest.
- Contract/liability belongs in deterministic templates before the orchestrator ranks actions.
- UI should not be built over unstable data shape.
- Mistral composer comes after deterministic plan works, because AI phrasing must be optional.

---

## 15. Stop Conditions

Stop and report instead of improvising if:

- A requested UI behavior requires changing legal verdicts without deterministic source.
- A route tries to auto-close findings or auto-accept evidence.
- A test requires adding Fiscal/Whistleblowing/Pay Transparency.
- Mistral output cannot be safely validated.
- The dashboard page becomes a monolith over 500 lines; split the component instead.
