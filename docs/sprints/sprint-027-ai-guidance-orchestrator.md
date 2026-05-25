# Sprint 027 — AI Guidance Orchestrator

**Status:** DONE (local, uncommitted)
**Faza:** 5 — Product intelligence / commercial hardening
**Start:** 2026-05-19
**End:** 2026-05-19
**Owner:** manual: Codex

---

## Goal (1 propoziție)

Construiește un AI Guidance Orchestrator production-grade care citește state-ul CompliRoAI, prioritățile legale și coverage matrix-ul existent, apoi generează un plan de lucru explicabil, auditat și role-aware, fără să inventeze legea și fără să execute automat acțiuni.

---

## Task list

- [x] Capturează mandatul strategic nou: 3 workspace-uri rămân locked; verticalele sunt overlays, nu produse separate.
- [x] Documentează gaps din cercetare: Art. 10, Art. 13, Art. 15, Art. 23-25, Art. 47, Art. 86, GPAI Art. 53-55.
- [x] Documentează port map Claude Design pentru DS + orchestrator, fără a importa încă DS-ul în producție.
- [x] Extinde `ComplianceState` cu istoric AI guidance.
- [x] Construiește foundation pentru AI project profiles: stage, role, risk, evidence gaps, obligation templates.
- [x] Construiește guidance orchestrator determinist peste findings, preventive engine, AI project obligations și role next steps.
- [x] Include provider-grade backlog în guidance: Data & Model Evidence, Provider Instructions, Art. 15 evidence, value-chain checks, EU DoC, explanation workflow.
- [x] Implementează diff plan ieri/azi și explanation pentru acțiuni omise.
- [x] Implementează store pentru generated / accepted / rejected guidance plans cu audit events.
- [x] Implementează API `/api/ai-guidance` cu `GET`, `regenerate`, `accept`, `reject`, `explain-omitted`.
- [x] Montează UI `GuidancePlanPanel` în dashboard.
- [x] Montează drawer "Plan complet" cu surse, omisiuni, diff, guardrails și export.
- [x] Regenerare automată după acțiuni în Resolve cockpit.
- [x] Wire AI Guidance în Audit Pack (`ai-guidance/history.md`, `ai-guidance/current-plan.md`).
- [x] Extinde Audit Log UI cu entity `ai_guidance`.
- [x] TDD: teste pentru ranking, dedup, role-aware actions, omissions, diff, Audit Pack markdown și no stale routes.
- [x] TDD: provider-grade gaps Art. 10 / 13 / 15 / 47 sunt ridicate la severitate `high`, nu îngropate ca medium.
- [x] `npx tsc --noEmit`: clean.
- [x] `npm run build`: clean.
- [x] `npx vitest run`: 1342 / 1342 pass.
- [x] API smoke: register session + GET + regenerate + accept + explain omitted.
- [ ] Commit + push (de făcut doar la mandat explicit).

---

## Files created

- `docs/strategic/compliroai-ai-guidance-orchestrator-execution-plan-2026-05-19.md` — planul de execuție pentru orchestrator, cu scope, guardrails, DoD și dependențe.
- `docs/strategic/compliroai-claude-design-port-map-2026-05-19.md` — harta de portare pentru DS-ul Claude Design și zonele duplicate / de adaptat.
- `lib/compliance/ai-project-foundation.ts` — normalizează AI systems + role assessment în AI project profiles și obligation templates role/risk-aware.
- `lib/compliance/guidance-orchestrator.ts` — engine-ul determinist de planificare: candidate collection, scoring, dedupe, diff, omitted explanations, markdown.
- `lib/compliance/guidance-orchestrator.test.ts` — 9 teste pentru ranking, dedup, provider-grade actions, provider-grade severity, omissions, diff și route hygiene.
- `lib/server/guidance-plan-store.ts` — persistă planuri guidance, accept/reject, explain omitted și export markdown.
- `lib/server/guidance-plan-store.test.ts` — 4 teste pentru lifecycle, superseding, accept/reject și Audit Pack markdown.
- `app/api/ai-guidance/route.ts` — API route pentru preview, regenerate, accept, reject și explain omitted.
- `components/ai-guidance/guidance-plan-panel.tsx` — card + drawer UI pentru planul de lucru AI explicabil.
- `docs/sprints/sprint-027-ai-guidance-orchestrator.md` — acest log.

## Files modified

- `docs/strategic/compliroai-dpo-os-port-execution-mandate-2026-05-17.md` — adăugat mandatul actualizat: produs generalist AI Compliance OS, 3 workspaces locked, no vertical products, PwC benchmark, provider-grade gaps, positioning.
- `docs/sprints/INDEX.md` — Sprint 027 adăugat ca DONE local.
- `lib/compliance/types.ts` — adăugat `AIGuidancePlanRecord`, statusuri guidance, `aiGuidancePlans` în `ComplianceState`, entity type `ai_guidance`.
- `lib/compliance/engine.ts` — `initialComplianceState` include `aiGuidancePlans: []`.
- `lib/server/store.ts` — merge default pentru `aiGuidancePlans`.
- `app/dashboard/page.tsx` — montează guidance preview / latest plan în dashboard.
- `app/dashboard/resolve/page.tsx` — regenerează guidance după acțiuni de resolve / evidence / delete / create.
- `app/dashboard/audit-log/page.tsx` — label + color pentru `ai_guidance`.
- `lib/server/audit-pack-builder.ts` — adaugă secțiunea `ai-guidance/` în ZIP și counts în manifest.

## Files removed

— Nimic.

---

## Schema changes

- Supabase: nothing. State-ul este JSONB; nu necesită migrație separată.
- State extension: `ComplianceState.aiGuidancePlans?: AIGuidancePlanRecord[]`.
- Audit event entity extension: `ComplianceEventEntityType` include `ai_guidance`.

---

## Tests

- `npx vitest run lib/server/guidance-plan-store.test.ts lib/compliance/guidance-orchestrator.test.ts`: **13 / 13 pass**.
- `npx tsc --noEmit`: clean (0 errors).
- `npm run build`: clean.
- `npx vitest run`: **1342 / 1342 pass** (98 files).
- API smoke:
  - `POST /api/auth/register`: 200, throwaway org `Apex Logistic SRL`.
  - `GET /api/ai-guidance`: 200, returns deterministic preview.
  - `POST /api/ai-guidance` action `regenerate`: 200, persisted `AIGuidancePlanRecord`.
  - `POST /api/ai-guidance` action `accept`: 200, status `accepted`.
  - `POST /api/ai-guidance` action `explain-omitted`: 200, returns omission explanation.
- Browser/live note:
  - Fresh API-created user redirects `/dashboard` to `/onboarding`, expected because onboarding is not completed.
  - Full visual QA should run after using an onboarded seed/session or after DS porting.

---

## Decisions made

- **Decision A — deterministic first:** Compliance Gate, Preventive Engine, findings and coverage matrix remain source of truth. The AI layer only composes, explains and prioritizes.
- **Decision B — no legal hallucination:** Orchestrator actions cite existing deterministic sources and article anchors. No free-form legal conclusion becomes source of truth.
- **Decision C — AI does not execute:** Accepting a plan does not close findings, send emails, upload evidence or submit documents. It records prioritization and leaves execution to the human.
- **Decision D — preview can be accepted safely:** If user accepts/rejects a preview, UI first persists a snapshot, then accepts/rejects that exact snapshot for auditability.
- **Decision E — after-action regeneration:** Resolve cockpit regenerates guidance after meaningful actions so the plan does not stay stale after user work.
- **Decision F — omissions are first-class:** Plan stores omitted actions and exposes "de ce AI a omis X" so users can audit prioritization, not just output.
- **Decision G — plan diff is required:** Yesterday/today comparison is included to show progress and intelligence drift.
- **Decision H — 3 workspaces remain locked:** `imm-classic`, `ai-builder`, `cabinet` stay the product architecture. Human roles and sectors only change guidance, defaults and templates.
- **Decision I — DS not ported in this sprint:** Claude Design assets are documented separately. Sprint 027 focuses on working intelligence and wiring, not visual overhaul.
- **Decision J — provider-grade gaps are never soft guidance:** For high-risk provider systems, Art. 10, 13, 15, 23-25, 47 and 86 obligations rank as `high` so the plan does not hide audit-critical work behind cosmetic tasks.

---

## Concerns / Blockers

- ⚠️ **Mistral is not used yet in production guidance.** This is intentional for Sprint 027: deterministic plan first, model prose later. Next sprint can add Mistral as explainability layer with strict source injection and citation validation.
- ⚠️ **Full dashboard visual QA blocked by onboarding on the throwaway user.** API smoke is green. Browser QA should use an onboarded fixture/session or complete onboarding first.
- ⚠️ **DS port remains separate.** `_design-claude/` is untracked and should be reviewed/ported in a dedicated UI sprint to avoid mixing core intelligence with visual rewrite.
- (Niciun blocker tehnic pentru orchestrator.)

---

## Commits

- None yet. Work is local and uncommitted by design.

## Live URL

- Production after commit/push/deploy: `https://eu-ai-act-beige.vercel.app`
- Local tested via existing dev server: `http://localhost:3001`

---

## Dependencies

**Requires from previous sprints:**
- Sprint 008A/B — `ComplianceState`, findings, events and store adapter.
- Sprint 011 — Audit Pack builder and structured audit log.
- Sprint 022 — Preventive Engine + legislative change log.
- Sprint 026 — Legal coverage matrix and final hardening.

**Unlocks for next sprints:**
- Sprint 028 — Mistral-backed Guidance Explainer with RAG/citation validation, using the deterministic plan as input.
- Sprint 029 — Data & Model Evidence Layer (Art. 10 + Art. 15 provider-grade evidence).
- Sprint 030 — DS Light/Dark port from Claude Design over production pages.

---

## Notes pentru următorul agent

- `guidance-orchestrator.ts` must stay pure/deterministic. Do not let LLM output change legal verdicts, priorities or article anchors without validation.
- Keep `targetHref` values in sync with actual routes. Regression test prevents stale `/dashboard/annex-iv`.
- Do not add new top-level workspaces. Add role/sector behavior as overlays, templates or filtered defaults.
- If adding Mistral, persist prompt version, context snapshot, model name, token metadata and cited source ids in `AIGuidancePlanRecord.modelMeta`.
- If porting Claude Design, start from `docs/strategic/compliroai-claude-design-port-map-2026-05-19.md` and avoid committing `_design-claude/` raw prototype files unless intentionally curated.
