# CompliRoAI DPO-OS Port Execution Mandate

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` before implementing this plan task-by-task. Follow every checkpoint. If a checkpoint fails, stop the sprint, fix it, and log the decision.

**Goal:** Port the mature DPO-OS foundation and DPO privacy workflows into CompliRoAI, then layer EU AI Act workflows on top, producing a clean, role-aware AI Compliance OS that is production-ready.

**Architecture:** CompliRoAI remains the clean destination project and commercial shell. DPO-OS is the donor for mature privacy infrastructure. EU AI Act and GDPR/DPO obligations determine product functionality; market use cases only shape onboarding language and role workflows.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase `org_state` JSONB, HMAC `aiact_session`, Resend, JSZip, Vitest, Vercel.

---

## 0. Non-Negotiable Decision

CompliRoAI is not a vertical collection and not a thin AI Act checklist.

CompliRoAI is:

> **Full DPO-OS privacy infrastructure + EU AI Act layer = AI Compliance OS.**

The product is sold to three role/workflow groups:

- `imm-classic`: companies using AI internally or externally.
- `ai-builder`: companies building AI automations, AI agents, SaaS AI, chatbots, or AI workflows for clients.
- `cabinet`: DPOs, privacy consultants, AI compliance consultants, lawyers, and agencies managing multiple clients.

Verticals such as chatbot, copilot, HR, credit, medical, e-commerce, and agentic automation are not separate products. They are use-case categories inside one general compliance OS.

---

## 1. Absolute Rules For Opus / Any Agent

### Rule 1 — Port first, build new only when donor does not exist

New code is allowed only when:

- no donor implementation exists in DPO-OS or current CompliRoAI;
- the donor implementation is tied to a forbidden framework such as fiscal/pay transparency/whistleblowing and cannot be safely filtered;
- the EU AI Act layer needs functionality that DPO-OS never had.

Before writing a new module, the agent must search donors with `rg` and write the result in the sprint log.

Required evidence in sprint log:

```bash
rg "keyword-or-feature" /Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified
rg "keyword-or-feature" /Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/dpo-claude-polish
```

If donor exists, port/adapt it. Do not invent a parallel system.

### Rule 2 — Law determines functionality

Functionality is determined by:

- Regulation (EU) 2024/1689, the EU AI Act;
- GDPR;
- Romanian DPO/GDPR practice where relevant;
- DPO-OS workflows that already operationalize GDPR obligations.

Market research determines:

- wording;
- onboarding examples;
- sales positioning;
- role-specific IA;
- which use cases are prioritized first.

Market research does not replace the law and does not justify random features.

### Rule 3 — No unrelated frameworks enter CompliRoAI

Allowed:

- EU AI Act;
- GDPR / DPO workflows;
- vendor/DPA review where it supports AI/GDPR;
- DSAR, DPIA, RoPA, breach, training, audit trail, evidence, reports;
- DORA/NIS2 only as narrow AI-relevant slices when an AI system touches fintech, critical infrastructure, or regulated incident reporting.

Forbidden:

- fiscal;
- e-Factura;
- ANAF/SPV;
- SAF-T;
- Pay Transparency;
- Whistleblowing standalone;
- HR full suite outside AI literacy / HR AI risk;
- DORA full suite;
- NIS2 full suite;
- accounting product workflows.

If a donor file imports forbidden modules, the agent must either filter the dependency or stop and split the port into a smaller AI/GDPR-safe slice.

### Rule 4 — No vertical apps

Do not create separate apps for chatbot, copilot, agents, HR, credit, medical, e-commerce, or automation agencies.

Correct model:

- one CompliRoAI product;
- one shared compliance state;
- role-aware workspaces;
- use-case categories in onboarding and AI inventory.

### Rule 5 — Role workflow controls UI

Every role sees only what it needs for its workflow.

`imm-classic` sees:

- Role Assessment;
- AI Inventory;
- AI Risk Classification;
- Prohibited Practices;
- AI Literacy;
- Transparency Notices;
- Vendor AI Assessment;
- DPIA mini / GDPR impact;
- DSAR only if personal data is involved;
- Readiness Pack;
- Audit Pack.

`ai-builder` sees everything in `imm-classic`, plus:

- provider/deployer split;
- Annex IV;
- EU Database Wizard;
- Conformity Assessment;
- FRIA;
- Human Oversight;
- Logging Evidence;
- Post-Market Monitoring;
- AI Incident Reporting;
- QMS;
- API/SDK;
- deployment/change log.

`cabinet` sees:

- multi-client portfolio;
- white-label;
- magic links;
- client intake;
- all AI/GDPR workflows per client;
- approval queue;
- reports;
- Audit Pack per client;
- Trust Center per client.

No user should see fiscal, ANAF, e-Factura, Pay Transparency, or Whistleblowing standalone in CompliRoAI.

### Rule 6 — No slim ports

Forbidden phrases in execution:

- "wire later";
- "standalone for now";
- "without findings integration";
- "temporary duplicated store";
- "simple mock until later";
- "TODO";
- "we can integrate in another sprint".

If a module depends on `ScanFinding`, `ComplianceState`, `events`, `orgKnowledge`, or orchestrator, port the dependency first or wait until the dependency sprint is complete.

### Rule 7 — Every sprint ends with test + log + commit

A sprint is not complete unless all are true:

- code compiles;
- relevant unit tests pass;
- `npm run build` passes;
- sprint log exists in `docs/sprints/`;
- `docs/sprints/INDEX.md` is updated;
- commit exists with code and sprint log together;
- the final message states exact tests run.

No sprint log means the sprint does not exist.

---

## 2. Repositories, Branches, And Donor Hierarchy

### Destination project

Use this as the destination:

```text
/Users/vaduvageorge/Desktop/eu-ai-act
```

Expected branch:

```text
main
```

Remote:

```text
origin/main
```

Commercial identity:

```text
CompliRoAI
```

Session cookie:

```text
aiact_session
```

Header prefix:

```text
x-aiact-*
```

Environment prefix:

```text
AIACT_*
```

### Primary donor

Use this as the primary donor for mature DPO-OS and v3 UX/IA:

```text
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified
```

Observed branch at document creation:

```text
codex/dpo-into-v3-unified
```

Observed commit at document creation:

```text
39de660 merge(dpo): integrate dpo os into v3-unified
```

If this donor moves, inspect diff before using newer code. Do not blindly switch donors mid-sprint.

### Secondary donor

Use this only for DPO-specific polish, fixtures, and tests that are missing from primary donor:

```text
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/dpo-claude-polish
```

Observed branch:

```text
dpo-os-claude-polish
```

Important: this branch is ahead/behind heavily. It is not the base donor. Use it selectively and mention every copied file in sprint log.

### Do not use as donors for CompliRoAI

Do not port from these unless the user explicitly says so:

```text
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/bundle-d-fiscal
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/fiscal-mature
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/pay-transparency
```

These belong to other products/scopes.

---

## 3. Current State Snapshot

Before any work, refresh the snapshot:

```bash
cd /Users/vaduvageorge/Desktop/eu-ai-act
git status --short --branch
git log --oneline --decorate -12
```

Observed at document creation:

- `main` contained Sprint 008A foundation work.
- Sprint 008A log existed at `docs/sprints/sprint-008a-foundation-port.md`.
- `docs/strategic/compliroai-functional-spec-v2.md` was present.
- `docs/strategic/compliroai-ai-automation-library-2026-05-17.md` was present.
- There were untracked Sprint 008B files:
  - `app/api/findings/`
  - `lib/server/findings-store.ts`
  - `lib/server/findings-store.test.ts`

Instruction for current untracked 008B files:

- If they still exist and match Sprint 008B, continue them.
- Do not delete them.
- Do not start DPIA/RoPA before 008B is committed.
- If they are broken, fix them inside Sprint 008B and log every fix.

---

## 4. Legal Source Of Truth

The legal layer must be checked against official sources, not blog summaries.

Use these sources in legal sprint logs:

- European Commission AI Act regulatory framework: `https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai`
- AI Act Service Desk implementation timeline: `https://ai-act-service-desk.ec.europa.eu/en/ai-act/timeline/timeline-implementation-eu-ai-act`
- European Commission AI Literacy Q&A: `https://digital-strategy.ec.europa.eu/en/faqs/ai-literacy-questions-answers`
- EUR-Lex Regulation (EU) 2024/1689: `https://eur-lex.europa.eu/eli/reg/2024/1689/oj`
- EDPB GDPR guidance when implementing DPIA/DSAR/RoPA/DPO workflows.

Legal rule:

- EU AI Act determines AI obligations.
- GDPR determines privacy/DPO obligations.
- DPO-OS donor determines mature operational workflow patterns.
- The AI Automation Library determines intake examples and use-case categorization.

---

## 5. Target Architecture

### 5.1 State model

CompliRoAI must use one shared compliance state.

Do not create separate state systems for DPO, AI Act, findings, DPIA, and vendor review.

Target state:

```ts
type AIActState = ComplianceState
```

The state must support:

- AI systems;
- role assessments;
- transparency implementations;
- generated documents;
- readiness packs;
- DSAR requests;
- findings;
- events;
- org knowledge;
- discovery triggers;
- DPIA records;
- RoPA activities;
- breach records or breach-compatible findings;
- vendor reviews;
- AI data map records;
- training/literacy records;
- audit pack evidence.

### 5.2 Store pattern

All DPO-OS ports must use the CompliRoAI store adapter.

Allowed store functions:

```ts
readState()
writeState(state)
readFreshStateForOrg(orgId, orgName?)
mutateFreshStateForOrg(orgId, mutator, orgName?)
mergeWithDefault(partialState)
```

Do not introduce a second `mvp-store.ts` in CompliRoAI.

If donor code imports `@/lib/server/mvp-store`, adapt it to `@/lib/server/store`.

### 5.3 Events and audit trail

Any write that changes compliance posture must append a compliance event.

Examples:

- finding created;
- finding confirmed;
- evidence attached;
- finding resolved;
- DPIA created;
- RoPA activity created;
- breach assessed;
- AI system reclassified;
- vendor review created;
- approval requested;
- report exported.

Use:

```ts
appendComplianceEvents(state, [event])
createComplianceEvent(...)
```

Do not manually write `selfHash` or `prevHash`.

### 5.4 Findings lifecycle

Findings are the product cockpit.

Every risk-producing module must emit or update `ScanFinding`:

- AI risk classifier;
- prohibited practices;
- DPIA;
- RoPA;
- AI Data Discovery;
- PII Discovery;
- vendor review;
- breach;
- FRIA;
- human oversight;
- logging evidence;
- post-market monitoring;
- incident reporting.

Expected lifecycle:

```text
open -> confirmed -> under_monitoring -> resolved
open -> dismissed
resolved -> reopened
```

The UI must support:

- confirm;
- dismiss;
- resolve;
- monitor;
- reopen;
- attach evidence;
- view audit trail.

---

## 6. Porting Strategy

### 6.1 Approved order

The order is strict:

1. Sprint 008B — Findings + Dosar + Resolve.
2. Sprint 008C — DPIA + RoPA.
3. Sprint 008D — GDPR Breach 72h.
4. Sprint 009 — AI Data Discovery + PII Discovery + AI Exposure Report + AI Policy Pack.
5. Sprint 010 — Vendor AI Assessment + DPA review.
6. Sprint 011 — Audit Log structured UI.
7. Sprint 012 — DORA AI slice + NIS2 AI slice only.
8. Sprint 013 — Approval queue + Calendar + Trust Center.
9. Sprint 014 — PDF generator + Onboarding emails + Stripe.
10. Sprint 015 — Role-aware UI final.
11. Sprint 016 — FRIA.
12. Sprint 017 — Human Oversight.
13. Sprint 018 — Logging Evidence.
14. Sprint 019 — Post-Market Monitoring.
15. Sprint 020 — AI Incident Reporting.
16. Sprint 021 — QMS Workspace.
17. Sprint 022 — Preventive engine + renewal/change log.
18. Sprint 023 — API/SDK for AI builders.

Do not jump to AI depth before DPO foundation workflows are stable.

### 6.2 What "port" means

Porting means:

- search donor;
- copy core business logic when compatible;
- adapt imports to CompliRoAI store/auth/events;
- rewrite UI to CompliRoAI v3 inline style system;
- rewrite copy to Romanian and CompliRoAI branding;
- remove forbidden framework dependencies;
- keep mature tests or create equivalent tests;
- integrate with Audit Pack and Events if the module creates evidence.

Porting does not mean:

- blind file copy;
- global sed rename;
- duplicating donor storage;
- keeping donor role guards;
- leaving imports broken;
- leaving English UI;
- building a simplified clone.

### 6.3 Rewrite rules

Rewrite these donor patterns:

| Donor pattern | CompliRoAI replacement |
|---|---|
| `mvp-store.ts` | `lib/server/store.ts` adapter |
| `compliscan_session` | `aiact_session` |
| `x-compliscan-*` | `x-aiact-*` |
| `COMPLISCAN_*` | `AIACT_*` |
| `CompliScan` UI copy | `CompliRoAI` |
| fiscal labels | remove |
| NIS2 full surface | AI-critical slice only |
| DORA full surface | AI-fintech slice only |
| shadcn/Tailwind donor UI | CompliRoAI inline styles/v3 variables |
| `requireFreshRole` donor guards | `getOrgContext()` and workspace mode checks |

---

## 7. Sprint 008B — Findings + Dosar + Resolve

### Goal

Create the mature cockpit that receives risks from all later modules.

### Donor paths to inspect

```text
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/dashboard/findings
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/dashboard/dosar
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/dashboard/resolve
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/api/findings
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/api/portfolio/findings
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/shared-finding
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliscan/finding-cockpit.ts
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliscan/finding-kernel.ts
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliscan/finding-triage.ts
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/finding-lifecycle.ts
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/finding-resolution.ts
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/finding-confidence.ts
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/server/preserve-finding-runtime-state.ts
```

### Destination files

Existing/current Sprint 008B files may already exist:

```text
/Users/vaduvageorge/Desktop/eu-ai-act/lib/server/findings-store.ts
/Users/vaduvageorge/Desktop/eu-ai-act/lib/server/findings-store.test.ts
/Users/vaduvageorge/Desktop/eu-ai-act/app/api/findings/route.ts
/Users/vaduvageorge/Desktop/eu-ai-act/app/api/findings/[id]/route.ts
/Users/vaduvageorge/Desktop/eu-ai-act/app/api/findings/[id]/evidence/route.ts
/Users/vaduvageorge/Desktop/eu-ai-act/app/api/findings/[id]/share/route.ts
/Users/vaduvageorge/Desktop/eu-ai-act/app/api/findings/audit-trail/route.ts
```

Add UI:

```text
/Users/vaduvageorge/Desktop/eu-ai-act/app/dashboard/findings/page.tsx
/Users/vaduvageorge/Desktop/eu-ai-act/app/dashboard/dosar/page.tsx
/Users/vaduvageorge/Desktop/eu-ai-act/app/dashboard/resolve/page.tsx
/Users/vaduvageorge/Desktop/eu-ai-act/app/dashboard/resolve/[findingId]/page.tsx
```

### Required behavior

- List findings with severity, category, status, owner, deadline, and evidence hint.
- Create manual finding for AI/GDPR risks.
- Confirm, dismiss, resolve, reopen, monitor.
- Attach evidence with note and optional file/url metadata.
- Append audit event for every mutation.
- Preserve runtime state when findings are regenerated by later modules.
- Expose audit trail by finding.
- UI labels in Romanian.
- No fiscal category visible in UI even if `FindingCategory` still contains legacy union values for compatibility.

### Tests

Run:

```bash
cd /Users/vaduvageorge/Desktop/eu-ai-act
npx vitest run lib/server/findings-store.test.ts
npx tsc --noEmit
npm run build
```

Expected:

```text
all tests pass
0 TypeScript errors
build exits 0
```

### Commit

```bash
git add app/api/findings lib/server/findings-store.ts lib/server/findings-store.test.ts app/dashboard/findings app/dashboard/dosar app/dashboard/resolve docs/sprints docs/sprints/INDEX.md
git commit -m "feat(sprint-8b): port findings dosar resolve cockpit"
```

---

## 8. Sprint 008C — DPIA + RoPA

### Goal

Port DPIA and RoPA as mature GDPR workflows connected to findings, events, org knowledge, discovery triggers, and audit pack.

### Donor paths

```text
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/dashboard/dpia
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/dashboard/ropa
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/api/dpia
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/api/gdpr/dpia
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/api/ropa
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/dpia-schema.ts
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/dpia-schema.test.ts
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/ropa-risk-engine.ts
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/ropa-risk-engine.test.ts
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/ropa-machine-readable.test.ts
```

### Destination files

```text
/Users/vaduvageorge/Desktop/eu-ai-act/app/dashboard/dpia/page.tsx
/Users/vaduvageorge/Desktop/eu-ai-act/app/dashboard/ropa/page.tsx
/Users/vaduvageorge/Desktop/eu-ai-act/app/api/dpia/route.ts
/Users/vaduvageorge/Desktop/eu-ai-act/app/api/gdpr/dpia/route.ts
/Users/vaduvageorge/Desktop/eu-ai-act/app/api/ropa/route.ts
/Users/vaduvageorge/Desktop/eu-ai-act/lib/compliance/dpia-schema.ts
/Users/vaduvageorge/Desktop/eu-ai-act/lib/compliance/dpia-schema.test.ts
/Users/vaduvageorge/Desktop/eu-ai-act/lib/compliance/ropa-risk-engine.ts
/Users/vaduvageorge/Desktop/eu-ai-act/lib/compliance/ropa-risk-engine.test.ts
```

### Required behavior

- DPIA creates/updates `state.dpiaRecords`.
- RoPA creates/updates `state.ropaActivities`.
- DPIA and RoPA can emit `ScanFinding`.
- DPIA and RoPA append events.
- RoPA can create discovery triggers and org knowledge.
- AI systems can link to RoPA activities.
- RoPA export is machine-readable.
- UI explains why AI systems often trigger GDPR review.
- No fiscal/NIS2/DORA UI leaks.

### Tests

Run:

```bash
npx vitest run lib/compliance/dpia-schema.test.ts lib/compliance/ropa-risk-engine.test.ts
npx vitest run lib/server/findings-store.test.ts
npx tsc --noEmit
npm run build
```

Expected:

```text
all tests pass
0 TypeScript errors
build exits 0
```

### Commit

```bash
git add app/dashboard/dpia app/dashboard/ropa app/api/dpia app/api/gdpr/dpia app/api/ropa lib/compliance/dpia-schema.ts lib/compliance/dpia-schema.test.ts lib/compliance/ropa-risk-engine.ts lib/compliance/ropa-risk-engine.test.ts docs/sprints docs/sprints/INDEX.md
git commit -m "feat(sprint-8c): port dpia and ropa workflows"
```

---

## 9. Sprint 008D — GDPR Breach 72h

### Goal

Port the GDPR breach workflow, not full NIS2 incident management.

### Donor paths

```text
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/dashboard/breach
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/api/breach-notification
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/anspdcp-breach-rescue.ts
```

### Required behavior

- Create breach record or breach finding.
- Track 72h notification deadline.
- Decide if ANSPDCP notification is needed.
- Decide if data subjects need notification.
- Generate draft notification narrative.
- Append events.
- Include breach evidence in Audit Pack.
- No NIS2 full UI.
- If NIS2 logic is needed, keep only AI-critical incident slice for Sprint 012.

### Tests

Run:

```bash
npx vitest run
npx tsc --noEmit
npm run build
```

Expected:

```text
all tests pass
0 TypeScript errors
build exits 0
```

### Commit

```bash
git add app/dashboard/breach app/api/breach-notification lib/compliance/anspdcp-breach-rescue.ts docs/sprints docs/sprints/INDEX.md
git commit -m "feat(sprint-8d): port gdpr breach workflow"
```

---

## 10. Sprint 009 — AI Data Discovery + PII Discovery + Exposure Report

### Goal

Turn client intake and AI usage into live AI data map, PII detection, auto findings, AI Exposure Report, and Audit Pack evidence.

### Donor paths

```text
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/api/dpo/ai-data-discovery
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/api/dpo/ai-data-discovery/policy-pack
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/api/dpo/pii-discovery
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/ai-data-discovery.ts
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/ai-data-discovery.test.ts
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/pii-discovery.ts
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/pii-discovery.test.ts
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/ai-exposure-report.ts
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/ai-exposure-report.test.ts
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/components/compliscan/pii-discovery-panel.tsx
```

### Destination adaptation

Routes should use CompliRoAI naming:

```text
/Users/vaduvageorge/Desktop/eu-ai-act/app/api/ai-data-discovery
/Users/vaduvageorge/Desktop/eu-ai-act/app/api/ai-data-discovery/policy-pack
/Users/vaduvageorge/Desktop/eu-ai-act/app/api/pii-discovery
```

### Required behavior

- Intake asks practical AI questions from AI Automation Library.
- Each AI tool becomes an AI data map record.
- AI tool with personal data emits findings.
- HR/credit/medical/education/biometric cases become high-risk candidates.
- Chatbot/content generation cases trigger transparency notices.
- Unknown vendor training setting triggers finding.
- Missing DPA triggers finding.
- Missing DPIA for sensitive/high-impact processing triggers finding.
- AI Exposure Report is generated client-facing.
- Audit Pack includes AI data map and exposure report.

### Tests

Run:

```bash
npx vitest run lib/compliance/ai-data-discovery.test.ts lib/compliance/pii-discovery.test.ts lib/compliance/ai-exposure-report.test.ts
npx tsc --noEmit
npm run build
```

Expected:

```text
all tests pass
0 TypeScript errors
build exits 0
```

---

## 11. Sprint 010 — Vendor AI Assessment + DPA Review

### Goal

Port vendor review as AI/GDPR vendor assessment, not as NIS2 full vendor management.

### Donor paths

```text
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/dashboard/vendor-review
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/api/vendor-review
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/server/vendor-review-store.ts
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/vendor-review-engine.ts
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/vendor-review-lifecycle.ts
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/vendor-review-lifecycle.test.ts
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/vendor-library.ts
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/vendor-risk.ts
/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/vendor-prefill.ts
```

### Required behavior

- Vendor record links to AI system.
- DPA status tracked.
- Training data rights tracked.
- Subprocessor/transfer risk tracked.
- Security evidence tracked.
- Human review required for high-risk vendors.
- Findings emitted for missing DPA, missing transfer review, missing security evidence, missing AI terms.
- No NIS2 vendor UI unless in Sprint 012 AI-critical slice.

---

## 12. Sprint 011 — Structured Audit Log

### Goal

Expose the `ComplianceEvent` ledger in UI and make every important compliance action inspectable.

### Required behavior

- Dashboard page lists events.
- Filter by entity type, actor, date, module, severity.
- Verify hash chain.
- Export event ledger.
- Link event to finding/DPIA/RoPA/breach/vendor/AI system.
- Audit Pack includes event manifest.

---

## 13. Sprint 012 — DORA AI Slice + NIS2 AI Slice

### Goal

Add only AI-relevant slices, not full frameworks.

### Allowed DORA AI slice

- AI vendor in financial service;
- third-party AI risk;
- AI incident evidence;
- DORA-style resilience notes when an AI system is material to financial service delivery.

### Allowed NIS2 AI slice

- AI system used in essential/important entity;
- AI incident or cybersecurity AI system;
- incident escalation and evidence pack for AI-critical service.

### Forbidden

- full DORA dashboard;
- full NIS2 dashboard;
- generic DNSC registration;
- non-AI vendor management;
- generic cyber posture product.

---

## 14. Sprint 013 — Approval Queue + Calendar + Trust Center

### Goal

Port collaboration and customer-facing trust surfaces for cabinet workflows.

### Required behavior

- Approval queue for consultant/cabinet.
- Calendar/reminders for deadlines.
- Trust Center public per client/org.
- Magic links connect to approvals.
- White-label applied.
- Audit events for approvals and public evidence.

---

## 15. Sprint 014 — PDF Generator + Emails + Stripe

### Goal

Make the product commercially usable.

### Required behavior

- PDF generator for reports/readiness/audit outputs.
- Resend onboarding emails.
- Resend report delivery emails.
- Stripe billing and checkout.
- Pricing page matches locked pricing.
- No fiscal SKUs.
- No DPO-only product naming; use AI Compliance OS.

---

## 16. Sprint 015 — Role-Aware UI

### Goal

Each workspace sees the workflow it bought.

### Workspace rules

`imm-classic` navigation:

- Home;
- AI Inventory;
- AI Risk;
- Transparency;
- Literacy;
- Vendor;
- DPIA/GDPR;
- Findings;
- Readiness Pack;
- Audit Pack;
- Settings.

`ai-builder` navigation:

- Home;
- AI Inventory;
- Role Assessment;
- Annex IV;
- EU Database;
- Conformity;
- FRIA;
- Oversight;
- Logging;
- PMM;
- Incidents;
- QMS;
- API/SDK;
- Findings;
- Audit Pack;
- Settings.

`cabinet` navigation:

- Portfolio;
- Clients;
- Client Intake;
- AI Discovery;
- Findings;
- DPIA;
- RoPA;
- DSAR;
- Breach;
- Vendor;
- Reports;
- Audit Pack;
- Approval Queue;
- Calendar;
- Trust Center;
- Branding;
- Settings.

UI must not show irrelevant modules by default. Advanced modules can be unlocked when the role or AI use case requires them.

---

## 17. AI Act Depth Sprints

### Sprint 016 — FRIA

Implement FRIA for high-risk deployer contexts.

Required:

- trigger from high-risk candidate;
- affected persons;
- fundamental rights impact;
- mitigation plan;
- human review;
- approval;
- Audit Pack inclusion.

### Sprint 017 — Human Oversight

Required:

- oversight protocol per AI system;
- responsible human;
- escalation;
- contestation;
- stop/fallback procedure;
- evidence checklist.

### Sprint 018 — Logging Evidence

Required:

- log requirements by risk level;
- log evidence upload;
- retention;
- export;
- finding if missing logs.

### Sprint 019 — Post-Market Monitoring

Required:

- monitoring plan;
- performance/risk review;
- version changes;
- incidents;
- periodic reminders.

### Sprint 020 — AI Incident Reporting

Required:

- incident intake;
- severity;
- affected system;
- timeline;
- notification evidence;
- report draft.

### Sprint 021 — QMS Workspace

Required:

- policies;
- roles;
- documentation control;
- supplier controls;
- testing/validation;
- change management;
- PMM linkage.

---

## 18. Preventive Engine And API/SDK

### Sprint 022 — Preventive engine

Required:

- periodic reclassification;
- detect missing evidence;
- detect changed AI systems;
- email consultant/client;
- create findings automatically;
- update reports.

### Sprint 023 — API/SDK

Required:

- API for AI builders to classify systems;
- deployment metadata ingestion;
- compliance gate response;
- SDK docs in Romanian and English;
- example CI flow.

---

## 19. AI Automation Library Integration

Use:

```text
/Users/vaduvageorge/Desktop/eu-ai-act/docs/strategic/compliroai-ai-automation-library-2026-05-17.md
```

This library determines:

- onboarding questions;
- use-case categories;
- initial risk candidate;
- required evidence;
- auto findings;
- role-specific workflow.

Do not create vertical modules from the library. Use it to enrich one product.

Required category type:

```ts
type AIUseCaseCategory =
  | "customer_support"
  | "internal_copilot"
  | "sales_marketing"
  | "hr_workplace"
  | "finance_credit_fraud"
  | "medical_health"
  | "education"
  | "ecommerce_retail"
  | "legal_professional"
  | "ai_builder_agent"
  | "cybersecurity"
  | "public_sector_critical"
  | "other"
```

Required risk candidate type:

```ts
type AIRiskCandidate =
  | "prohibited_candidate"
  | "high_risk_candidate"
  | "transparency_limited"
  | "minimal"
  | "needs_human_review"
```

---

## 20. Branding And Copy Rules

Allowed product names:

- CompliRoAI;
- AI Compliance OS;
- AI Act + GDPR evidence OS.

Forbidden product names in CompliRoAI UI:

- CompliScan;
- DPO app;
- fiscal copilot;
- ANAF mirror;
- Pay Transparency OS;
- Whistleblowing OS.

Romanian copy is required for UI.

English can exist only in:

- developer API docs;
- export language option;
- bilingual readiness pack.

---

## 21. Validation Matrix

### Every sprint

Run:

```bash
cd /Users/vaduvageorge/Desktop/eu-ai-act
npx tsc --noEmit
npx vitest run
npm run build
```

Expected:

```text
0 TypeScript errors
all tests pass
build exits 0
```

### UI sprint

Also run local browser verification:

```bash
npm run dev
```

Then verify:

- `/`
- `/dashboard`
- `/dashboard/sisteme`
- `/dashboard/findings`
- `/dashboard/dpia`
- `/dashboard/ropa`
- `/dashboard/audit-pack`
- role-specific navigation after onboarding.

Expected:

- no fiscal modules visible;
- no broken navigation;
- no English copy in main UI;
- no missing core CTA;
- no console runtime error.

### Audit/evidence sprint

Also verify:

- export downloads;
- ZIP opens;
- manifest exists;
- hash chain verifies;
- events are present;
- generated reports include new module evidence.

---

## 22. Sprint Log Template Requirements

Each sprint log must include:

- status;
- start/end;
- owner;
- donor paths inspected;
- files created;
- files modified;
- files intentionally skipped;
- schema/state changes;
- tests run with output summary;
- build result;
- legal references used;
- decisions made;
- concerns;
- next dependencies;
- commit hash.

Use:

```text
/Users/vaduvageorge/Desktop/eu-ai-act/docs/sprints/_TEMPLATE.md
```

Update:

```text
/Users/vaduvageorge/Desktop/eu-ai-act/docs/sprints/INDEX.md
```

---

## 23. Stop Conditions

Stop and ask for direction only if:

- donor implementation requires forbidden framework code and cannot be filtered safely;
- legal interpretation affects product obligations materially;
- state migration would break existing production data;
- tests reveal corruption in current committed foundation;
- merge conflict risks deleting existing working code.

Do not stop for:

- UI copy choices;
- route naming choices already covered here;
- minor TypeScript adapter issues;
- missing donor tests that can be recreated;
- simple import rewrites.

---

## 24. Anti-Patterns That Must Not Happen Again

Do not:

- start a module before its foundation is ready;
- create a parallel state store;
- create a second findings model;
- port NIS2 full because breach mentions incident;
- port fiscal vendor logic into AI vendor review;
- expose every module to every role;
- write features because market screenshots look interesting if the law/workflow does not need them;
- ship "basic" page that cannot write state;
- ship page without testable API;
- leave a module out of Audit Pack;
- leave a module out of event log.

---

## 25. Final Execution Instruction For Opus

Start from the current `eu-ai-act/main`.

First command:

```bash
cd /Users/vaduvageorge/Desktop/eu-ai-act
git status --short --branch
```

If Sprint 008B untracked files still exist, finish Sprint 008B first.

Do not start DPIA, RoPA, Breach, AI Data Discovery, Vendor, or Role-aware UI until Sprint 008B is committed and validated.

Execution order:

```text
008B -> 008C -> 008D -> 009 -> 010 -> 011 -> 012 -> 013 -> 014 -> 015 -> 016 -> 017 -> 018 -> 019 -> 020 -> 021 -> 022 -> 023
```

After each sprint:

```bash
npx tsc --noEmit
npx vitest run
npm run build
git status --short
git add <changed files> docs/sprints docs/sprints/INDEX.md
git commit -m "<sprint commit message>"
```

No sprint is done without a sprint log and a clean build.

The target is not "some features ported".

The target is:

> **CompliRoAI: role-aware AI Compliance OS, with DPO-OS maturity, EU AI Act obligations, GDPR evidence, and zero unrelated framework pollution.**

