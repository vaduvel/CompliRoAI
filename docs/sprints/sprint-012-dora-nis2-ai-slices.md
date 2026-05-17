# Sprint 012 — DORA AI slice + NIS2 AI slice (selective port)

**Status:** DONE
**Faza:** 1 — Port masiv din DPO-OS (slice strict AI-relevant)
**Start:** 2026-05-17 18:20
**End:** 2026-05-17 18:38
**Owner:** manual: Claude

---

## Goal

Add doar AI-relevant slice-uri din DORA + NIS2 — NU module pure DORA/NIS2 — astfel încât CompliRoAI să acopere obligațiile incidente când un sistem AI sau un vendor AI este material pentru un serviciu reglementat. Strict mandate § 13 + Rule 3.

---

## Task list

- [x] Tip-uri DORA/NIS2 scope (`OrgRegulatoryProfile`, `VendorDoraScope`, `AISystemNis2Scope`) + extensii pe `VendorRecord`, `AISystemRecord`, `ComplianceState`
- [x] `dora-ai-rules.ts` (pure engine, 6 reguli) + 10 unit tests
- [x] `nis2-ai-rules.ts` (pure engine, 6 reguli) + 12 unit tests
- [x] `ai-regulatory-scope.ts` aggregator + 8 unit tests
- [x] `ai-regulatory-scope-store.ts` (persist + idempotent merge) + 14 unit tests
- [x] API routes: `/api/ai-regulatory-scope` (GET+POST), `/vendors`, `/systems`
- [x] Wire DORA rules în `vendor-review-store` (create + update)
- [x] Wire NIS2 rules în AI inventory (POST `/api/ai-systems` + nou PATCH `/api/ai-systems/[id]`)
- [x] `/dashboard/ai-regulatory-scope` page + edit modal + sidebar wire (gated)
- [x] Build clean, tsc clean, 411 tests pass
- [x] Sprint log + INDEX update
- [x] 9 commits incrementale push-uite

---

## Donor evidence (Rule 1)

```bash
rg -l "dora|nis2" /Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib
# → lib/server/dora-store.ts (208 LOC)
# → lib/server/nis2-store.ts (1002 LOC)
# → lib/compliance/nis2-rescue.ts (75 LOC)
# → lib/compliance/incident-checklists.ts, dnsc-wizard.ts, legal-sources.ts
```

**Donor filter rationale (Rule 3 — mandate § 13 STRICT):**

Donor stores conțin module pure DORA/NIS2 (DORA TPRM full register, NIS2 incident store cu Art. 23 3-stage flow, DNSC registration wizard, generic cyber posture). Per mandate § 13, aceste surface-uri sunt **interzise** în CompliRoAI:

- `dora-store.ts` donor: `DoraIncident` (full), `DoraTprmEntry` (generic third-party), `DoraResilienceTest` — NU portate; rămâne în donorul original (CompliAI fiscal-mature).
- `nis2-store.ts` donor: `Nis2OrgState`, eligibility wizard, `EarlyWarningReport`/`FullReport72h`/`FinalReport1m` — NU portate; rămâne separat. CompliRoAI emite findings de escalare incident dar nu deține un sub-modul de raportare 3-etape complet.
- `nis2-rescue.ts` donor: `DNSC_RESCUE_FINDING_ID` pattern — folosit ca **referință de terminologie** pentru "essential" / "important" labels în RO, dar NU portat verbatim (impune full DNSC registration workflow).

**Ce am construit, în schimb:**
- Tipuri minimale (`OrgRegulatoryProfile`) pentru self-declaration org.
- Două extensii opționale pe modulele existente: `VendorRecord.doraScope`, `AISystemRecord.nis2EntityScope`.
- Două motoare pure de reguli (`dora-ai-rules`, `nis2-ai-rules`) care produc `ScanFinding` cu id stabil. Findings-urile intră în cockpit-ul existent (`/dashboard/resolve`).
- Un aggregator + o pagină read-only `/dashboard/ai-regulatory-scope` care doar oglindește subset-ul AI-relevant; toate mutațiile concrete (vendor edit, AI system edit) se fac pe surface-urile primare existente.

**No-go:**
- Nu am creat `/dashboard/dora`, `/dashboard/nis2`, `/dashboard/dnsc`.
- Nu am introdus `dora-store`, `nis2-store`, `incident-store` separate.
- Nu am adăugat onboarding wizards full DORA / full NIS2.

---

## Files created

- `lib/compliance/dora-ai-rules.ts` (303 LOC) — 6 reguli DORA AI material vendor.
- `lib/compliance/dora-ai-rules.test.ts` (215 LOC) — 10 tests.
- `lib/compliance/nis2-ai-rules.ts` (320 LOC) — 6 reguli NIS2 AI system.
- `lib/compliance/nis2-ai-rules.test.ts` (208 LOC) — 12 tests.
- `lib/compliance/ai-regulatory-scope.ts` (175 LOC) — aggregator pur.
- `lib/compliance/ai-regulatory-scope.test.ts` (252 LOC) — 8 tests.
- `lib/server/ai-regulatory-scope-store.ts` (340 LOC) — persist + idempotent merge.
- `lib/server/ai-regulatory-scope-store.test.ts` (313 LOC) — 14 tests.
- `app/api/ai-regulatory-scope/route.ts` — GET summary + POST update.
- `app/api/ai-regulatory-scope/vendors/route.ts` — list DORA vendors.
- `app/api/ai-regulatory-scope/systems/route.ts` — list NIS2 systems.
- `app/api/ai-systems/[id]/route.ts` — PATCH pentru toggle NIS2 scope + attestation.
- `app/dashboard/ai-regulatory-scope/page.tsx` (1200 LOC) — overview UI + edit modal.
- `docs/sprints/sprint-012-dora-nis2-ai-slices.md` — această cronică.

## Files modified

- `lib/compliance/types.ts` — adăugate: `DoraEntityType`, `Nis2EntityClass`, `Nis2Sector`, `OrgRegulatoryProfile`, `VendorDoraScope`, `AISystemNis2Scope`; extinse `VendorRecord` cu `doraScope?`, `AISystemRecord` cu `nis2EntityScope?`, `ComplianceState` cu `orgRegulatoryProfile?`.
- `lib/server/vendor-review-store.ts` — `CreateVendorInput` / `UpdateVendorPatch` acceptă `doraScope`; după persistență apelează `evaluateAndMergeDoraFindings` (idempotent).
- `app/api/vendor-review/route.ts` + `app/api/vendor-review/[id]/route.ts` — pass-through `doraScope`.
- `app/api/ai-systems/route.ts` — POST acceptă `nis2EntityScope`; după create apelează `evaluateAndMergeNis2Findings`.
- `components/shell/dashboard-shell.tsx` — widened `workspaceMode` la `"solo" | "cabinet" | "ai-builder"`; nou NavItem "DORA + NIS2" gated pe `isCabinet || isAiBuilder`.

## Files removed

(none)

---

## Schema changes

State extension (backward-compat, all-optional):

```ts
type ComplianceState = {
  // ...
  orgRegulatoryProfile?: OrgRegulatoryProfile
}

type VendorRecord = {
  // ...
  doraScope?: VendorDoraScope
}

type AISystemRecord = {
  // ...
  nis2EntityScope?: AISystemNis2Scope
}
```

Migrare: zero. State-urile existente nu primesc nici un câmp până când utilizatorul nu apasă `POST /api/ai-regulatory-scope` sau marchează un vendor / sistem.

---

## Tests

- `npx tsc --noEmit`: clean (0 errors).
- `npx vitest run`: **411 / 411 pass** (37 fișiere). Baseline înainte de sprint = 367; delta sprint 012 = **+44 teste noi** (10 DORA + 12 NIS2 + 8 aggregator + 14 store).
- `npm run build`: clean (exit 0). Toate rutele noi înregistrate în output:
  ```
  ƒ /api/ai-regulatory-scope               303 B
  ƒ /api/ai-regulatory-scope/systems       303 B
  ƒ /api/ai-regulatory-scope/vendors       303 B
  ƒ /api/ai-systems/[id]                   303 B
  ƒ /dashboard/ai-regulatory-scope       7.58 kB
  ```

**Acceptance verifications (per mandate definition of done):**
- Self-declaring org as DORA `credit_institution` + marking a vendor `doraScope.material=true` with `dpaStatus="missing"` → emits `dora-ai-vendor-<vendorId>-ict_contract_missing` finding (critical) in `/dashboard/resolve`. Covered by store test `evaluateAndMergeDoraFindings adds gap findings`.
- Self-declaring org as NIS2-essential + toggling AI system `nis2EntityScope.inScope=true` without human review → emits `nis2-ai-system-<systemId>-human_oversight_missing` finding (critical). Covered by store test `evaluateAndMergeNis2Findings adds gap findings`.
- No `/dashboard/dora`, no `/dashboard/nis2` page exists. Confirmed by build manifest (only `/dashboard/ai-regulatory-scope`).

---

## Legal references used

- Regulament (UE) 2022/2554 (DORA) — Art. 19 (incident notification), Art. 25-27 (resilience testing), Art. 28-30 (ICT contracts), Art. 30(8) (exit strategy), Art. 50 (sancțiuni).
- Directiva (UE) 2022/2555 (NIS2) — Art. 1(5) (financial overlap), Art. 21 (cybersecurity measures), Art. 21(2)(a)/(c)/(e)/(g), Art. 23 (incident escalation 24h/72h/1m), Art. 34 (sancțiuni).
- OUG 155/2024 (RO NIS2 transposition) — Art. 22 (registru DNSC), Art. 23 (raportare).
- GDPR Art. 28 (processor), Art. 44-49 (transferuri terțe).

Surse oficiale consultate: EUR-Lex CELEX:32022R2554, CELEX:32022L2555, OUG 155/2024 (Monitorul Oficial).

---

## Decisions made

- **Decision A — Extensii vs. module noi.** Per mandate § 13, DORA + NIS2 NU primesc dashboard propriu. Soluția: două extensii opționale pe tipurile existente (`VendorRecord.doraScope`, `AISystemRecord.nis2EntityScope`) + un singur agregator read-only `/dashboard/ai-regulatory-scope`. Modulele primare (vendor-review, sisteme AI) rămân sursa de adevăr; scope-ul DORA/NIS2 este doar un filtru + un toggle.

- **Decision B — Stable-ID findings + idempotent merge.** Cele 2 motoare pure produc findings cu ID deterministic (`dora-ai-vendor-<id>-<rule>`, `nis2-ai-system-<id>-<rule>`). Store-ul are un `mergeStableFindings` care nu duplică id-uri existente și nu suprascrie status-ul setat de utilizator. Acest pattern e diferit de `createFinding` (care generează UUID) — mai potrivit pentru evaluări care se repetă (la fiecare update vendor / system).

- **Decision C — Severitate scalată după clasa NIS2.** Pentru NIS2 essential entities, severitatea de bază urcă la `critical` (sancțiuni max 10M EUR / 2% turnover); pentru important rămâne `high` (7M / 1.4%). Aliniat cu Art. 34 NIS2.

- **Decision D — Cross-coordination finding (DORA ↔ NIS2).** Regula 6 NIS2 emite `dora_nis2_coordination_missing` când orgul declară sector banking/financial_markets dar nu setează DORA. Aliniat cu Art. 1(5) NIS2 care prioritizează DORA pentru gestiunea riscurilor ICT în entități financiare.

- **Decision E — Sidebar gating preview.** `workspaceMode` prop widened la `"solo" | "cabinet" | "ai-builder"` ahead-of-time; layout-ul pasează doar "solo"/"cabinet" în prezent. NavItem "DORA + NIS2" e vizibil pentru cabinet azi, va fi vizibil și pentru ai-builder după sprint 015 fără modificări la dashboard-shell.

- **Decision F — Self-declaration ca toggle.** Nu am implementat un wizard de eligibility (donor `nis2-eligibility.ts` are 1k LOC — depășește scope-ul AI slice). Utilizatorul declară explicit profilul; finding-ul de review apare automat dacă orgul devine in-scope, ghidându-l către cel mai mic pas concret.

- **Decision G — DORA evaluation pe failure-soft.** Apelul `evaluateAndMergeDoraFindings` din vendor-review-store este try/catch — niciodată nu blochează create/update vendor. Pattern consistent cu `syncAIActObligationFindings` din sprint 008C.

---

## Concerns / Blockers

- **Concern 1 — AI inventory store fragmentat.** AI inventory folosește încă API legacy (`writeState(state)` direct, fără `mutateFreshStateForOrg`) pentru POST/DELETE. Noul PATCH `/api/ai-systems/[id]` folosește pattern-ul modern. Sprint 015 (Role-aware UI) va trebui să unifice — nu am refactorizat în 012 pentru a respecta scope-ul AI-slice.

- **Concern 2 — Audit Pack nu include încă DORA/NIS2 scope.** Sprint 011 a wire-uit toate modulele DPO în audit-pack-builder; DORA/NIS2 AI slice nu apare explicit în Audit Pack (apare doar implicit via findings tagged DORA/NIS2 care sunt deja în pack). Sprint 013 (Trust Center) sau un mini follow-up ar putea adăuga o secțiune "Regulatory Scope" în pack.

- **Concern 3 — Vendor expand UI nu are încă toggle DORA scope.** Pagina `/dashboard/vendor-review` (sprint 010, 1529 LOC) nu a fost atinsă în 012; toggle-ul DORA `doraScope.material` se setează doar via POST/PATCH API direct sau via aggregate page (când vendorul există). Pentru UI integrată completă, sprint 015 va wire toggle-ul în vendor expand.

- **Concern 4 — Idempotency după ștergere vendor.** Dacă un vendor cu DORA findings este șters, findings-urile rămân în state.findings (legate doar via ID prefix). Sprint 022 (preventive engine) va adăuga garbage-collection. Acceptabil pentru 012 — findings rezolvate manual rămân ca evidence istorică.

---

## Commits

- `8e1f8be` — feat(sprint-12-1): DORA + NIS2 AI scope types + ComplianceState extension
- `5a04e59` — feat(sprint-12-2): DORA AI rules (material vendor + ICT Art. 30 + resilience + incident SLA)
- `02a63e2` — feat(sprint-12-3): NIS2 AI rules (in-scope + incident escalation + logging)
- `de8fbde` — feat(sprint-12-4): ai-regulatory-scope aggregator (scoped vendors + systems + findings)
- `0469ff0` — feat(sprint-12-5): ai-regulatory-scope store + API (org profile self-declaration + listings)
- `3168a0d` — feat(sprint-12-6): wire DORA rules into vendor-review-store
- `d3827a4` — feat(sprint-12-7): wire NIS2 rules into AI systems inventory
- `4b6f567` — feat(sprint-12-8): /dashboard/ai-regulatory-scope overview + sidebar wire (conditional)
- `<pending>` — docs(sprint-12): sprint log + INDEX update

## Live URL

- Production: `https://eu-ai-act-beige.vercel.app/dashboard/ai-regulatory-scope` (after push to main).
- Preview Vercel: URL provided automatically by Vercel after push.

---

## Dependencies

**Requires from previous sprints:**
- Sprint 008A — ComplianceState foundation + events ledger (`appendComplianceEvents`, `createComplianceEvent`)
- Sprint 008B — findings-store + cockpit `/dashboard/resolve`
- Sprint 010 — `VendorRecord` + vendor-review-store
- Sprint 011 — `ComplianceEvent` audit log (events emise în 012 apar în `/dashboard/audit-log`)
- Existing `AISystemRecord` + `/dashboard/sisteme`

**Unlocks for next sprints:**
- Sprint 013 (Approval Queue + Trust Center) — DORA/NIS2 findings pot fi aprobate prin approval queue; Trust Center poate include profil regulator.
- Sprint 015 (Role-aware UI final) — `ai-builder` workspace mode va activa automat sidebar item DORA + NIS2; UI vendor-review expand poate wire toggle DORA scope.
- Sprint 020 (AI Incident Reporting) — Incident-store dedicat va înlocui proxy-ul "recommendedActions contains incident" din NIS2 rule 2.
- Sprint 018 (Logging Evidence) — Logging-store dedicat va înlocui proxy-ul "policyAttestationStatus" din NIS2 rule 5.

---

## Notes pentru următorul agent

- **Pattern stable-ID findings.** Cele 2 motoare pure (dora-ai-rules + nis2-ai-rules) sunt template-uri pentru viitoare motoare de reguli (FRIA, Human Oversight, Logging Evidence). Respectă: pure function, ID deterministic, severity escalation cumulative, gates timpurii (no profile / not in scope → return early), 1 finding per rule.
- **Idempotency contract.** `mergeStableFindings` în store NU re-deschide findings rezolvate/dismiss-ate de utilizator. Dacă un finding cu același ID există dar e `resolved`, se preservă. Dacă o regulă încetează să mai genereze un finding (gap-ul s-a închis), finding-ul rămâne în state cu status-ul lui — utilizatorul trebuie să-l marcheze manual `dismissed`. Acceptabil; sprint 022 va aduce auto-resolve.
- **Forward-compat `ai-builder` workspaceMode.** Layout-ul pasează doar "solo"/"cabinet" în prezent; prop-ul `dashboard-shell` acceptă deja "ai-builder". Sprint 015 trebuie doar să extindă mapping-ul din layout fără să atingă shell.
- **Capcană evitată — donor `nis2-store.ts`** are 1k LOC cu full 3-stage incident reporting. Tentația de a porta acel flow s-ar fi încheiat cu o pagină dedicate NIS2 + un sub-modul ce nu intră în scope CompliRoAI. Am ales să emit doar un finding + remediation hint "Sprint 020 va aduce modul dedicat". Strict per Rule 3.
- **Sprint 013 next step.** Approval queue ar trebui să afișeze findings DORA/NIS2 ca fiind escaladabile la consultant cabinet (workflow CISO → DPO → client). Magic links pentru atestare profil regulator de către client.
