# Mistral Compliance Orchestrator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the CompliRoAI Mistral orchestration layer that turns imported state into structured compliance work, never into final legal verdicts.

**Architecture:** Keep deterministic engines as source of truth. Add a separate server-side orchestrator that snapshots tenant state, calls Mistral only on explicit run, validates structured JSON, records audit events, and exposes proposals to the existing AI Guidance surface.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Mistral chat completions API, existing `ComplianceState`, `AIUseCaseRecord`, `ScanFinding`, audit ledger.

---

### Task 1: Orchestrator Contract And Validator

**Files:**
- Create: `lib/server/ai-orchestrator/types.ts`
- Create: `lib/server/ai-orchestrator/validator.ts`
- Test: `lib/server/ai-orchestrator/validator.test.ts`

- [ ] **Step 1: Write failing validator tests**

```ts
import { describe, expect, it } from "vitest"
import { validateOrchestratorProposal } from "./validator"

describe("validateOrchestratorProposal", () => {
  it("rejects final legal verdicts from the model", () => {
    const result = validateOrchestratorProposal({
      schemaVersion: "orchestrator.v1",
      finalLegalVerdict: true,
      proposedFindings: [],
      evidenceRequests: [],
      reviewTasks: [],
      nextActions: [],
      exportBlockers: [],
      clientQuestions: [],
      obsoleteCandidates: [],
    })
    expect(result.ok).toBe(false)
  })

  it("requires legal basis and evidence on proposed findings", () => {
    const result = validateOrchestratorProposal({
      schemaVersion: "orchestrator.v1",
      finalLegalVerdict: false,
      proposedFindings: [{ code: "x", title: "x", severity: "high", ownerRole: "dpo", legalBasis: [], requiredEvidence: [] }],
      evidenceRequests: [],
      reviewTasks: [],
      nextActions: [],
      exportBlockers: [],
      clientQuestions: [],
      obsoleteCandidates: [],
    })
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `npm test -- --run lib/server/ai-orchestrator/validator.test.ts`

- [ ] **Step 3: Implement contract and validator**

Create typed proposal objects with guardrails:
- `finalLegalVerdict` must be false.
- Findings must include `code`, `title`, valid severity, `ownerRole`, legal basis, and required evidence.
- `riskDraft` may contain `high_risk_candidate` or `prohibited_candidate`, but never final high-risk/prohibited verdict.

- [ ] **Step 4: Run tests and confirm GREEN**

Run: `npm test -- --run lib/server/ai-orchestrator/validator.test.ts`

### Task 2: Tenant State Snapshot And Fingerprint

**Files:**
- Create: `lib/server/ai-orchestrator/state-snapshot.ts`
- Create: `lib/server/ai-orchestrator/fingerprint.ts`
- Test: `lib/server/ai-orchestrator/state-snapshot.test.ts`

- [ ] **Step 1: Write failing snapshot tests**

Cover:
- Snapshot includes AI use cases, open findings, vendors, RoPA, literacy, evidence counts.
- Snapshot is tenant-scoped by current state only.
- Fingerprint is stable for same normalized state.

- [ ] **Step 2: Implement compact snapshot**

Snapshot must avoid raw full evidence files. It may include IDs, names, status, legal refs, certainty/review status, due dates, and counts.

- [ ] **Step 3: Run tests**

Run: `npm test -- --run lib/server/ai-orchestrator/state-snapshot.test.ts`

### Task 3: Mistral Client With Safe Test Mode

**Files:**
- Create: `lib/server/ai-orchestrator/mistral-client.ts`
- Test: `lib/server/ai-orchestrator/mistral-client.test.ts`

- [ ] **Step 1: Write failing client tests**

Cover:
- No network call without API key.
- Mock/fetch-injected call sends one JSON-only prompt.
- Parsed JSON proposal is returned.
- Non-OK response falls back cleanly.

- [ ] **Step 2: Implement client**

Use `MISTRAL_API_KEY` and `MISTRAL_MODEL`. Do not call Mistral in automated tests unless a fetch mock is injected or `MISTRAL_LIVE_TESTS=1`.

- [ ] **Step 3: Run tests**

Run: `npm test -- --run lib/server/ai-orchestrator/mistral-client.test.ts`

### Task 4: Orchestrator Runner And Audit Event

**Files:**
- Create: `lib/server/ai-orchestrator/run.ts`
- Modify: `lib/compliance/types.ts`
- Test: `lib/server/ai-orchestrator/run.test.ts`

- [ ] **Step 1: Write failing runner tests**

Cover:
- Runner builds deterministic baseline first.
- Runner validates model proposal before returning it.
- Runner creates an audit event for proposal generation.
- Invalid model output returns deterministic fallback and does not commit unsafe findings.

- [ ] **Step 2: Add state record types**

Add `AIOrchestratorRunRecord` to `ComplianceState`, storing input fingerprint, status, proposal, validation errors, model metadata, and audit timestamps.

- [ ] **Step 3: Implement runner**

Use snapshot + deterministic plan + Mistral proposal + validator + audit ledger. Do not resolve findings automatically.

- [ ] **Step 4: Run tests**

Run: `npm test -- --run lib/server/ai-orchestrator/run.test.ts`

### Task 5: API And Existing AI Guidance UI Integration

**Files:**
- Create: `app/api/ai-orchestrator/route.ts`
- Modify: `components/ai-guidance/guidance-plan-panel.tsx`
- Test: existing guidance tests plus TypeScript build

- [ ] **Step 1: Add API contract tests where local patterns exist**

Endpoint supports:
- `POST { action: "run" }`
- `GET` latest orchestrator run

- [ ] **Step 2: Add UI trigger**

The UI label must communicate orchestration:
- `Rulează orchestrator`
- `Mistral verifică state-ul și propune acțiuni. Omul aprobă.`

- [ ] **Step 3: Run build**

Run: `npx tsc --noEmit`

### Task 6: Feature Completeness And Smoke

**Files:**
- Existing app pages and route handlers

- [ ] **Step 1: Run targeted tests**

Run: `npm test -- --run lib/server/ai-orchestrator`

- [ ] **Step 2: Run full TypeScript check**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Verify UI in browser**

Open `http://localhost:3001/dashboard` and verify the orchestrator button appears and does not auto-call Mistral until clicked.

- [ ] **Step 4: Optional live Mistral smoke**

Only if explicitly allowed for that run:

```bash
MISTRAL_LIVE_TESTS=1 npm test -- --run lib/server/ai-orchestrator/mistral-client.live.test.ts
```

### Self-Review

- Spec coverage: covers orchestration over state, Mistral usage, deterministic validation, no final legal verdicts, audit events, and UI entry.
- Placeholder scan: no TODO/TBD implementation placeholders.
- Type consistency: proposal, run record, snapshot, and validator names are stable across tasks.
