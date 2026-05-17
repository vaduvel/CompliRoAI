# Sprint 016 — FRIA Generator (Art. 27 AI Act)

**Status:** DONE
**Faza:** 3 (AI Act Depth — build new)
**Start:** 2026-05-17 ~22:50
**End:** 2026-05-17 ~23:30
**Owner:** subagent (general-purpose) + manual: Claude (cleanup 16-8/16-9)

---

## Goal

Build the **FRIA Generator** (Fundamental Rights Impact Assessment) as a mature workflow for deployers of high-risk AI systems per **EU AI Act Art. 27 + EU Charter of Fundamental Rights**.

**BUILD NEW** sprint — no DPO-OS donor existed. CompliRoAI is the first product in RO market to ship a working FRIA Generator.

---

## Task list

- [x] FRIA types + ComplianceState extension
- [x] FRIA schema (6-section wizard, 24 fundamental rights)
- [x] FRIA trigger detection (Art. 27(1)(a)(b))
- [x] FRIA evaluator (likelihood × severity matrix + finding emission + markdown gen)
- [x] FRIA store adapter (CRUD + workflow: approve/reject/notify-authority/reuseDpia)
- [x] FRIA API routes (7 routes: list + CRUD + workflow + export + trigger-check)
- [x] /dashboard/fria UI (replace ComingSoonPage with real 6-step wizard + list + risk matrix + AI Inventory banner)
- [x] Wire FRIA into Audit Pack ZIP (`fria/registry.md` + `fria/records/{id}.md`)
- [x] Remove coming-soon badge from nav-config; FRIA shared cu ai-builder + cabinet
- [x] `npx tsc --noEmit` clean
- [x] `npx vitest run` 615/615 pass
- [x] `npm run build` clean
- [x] Sprint log + INDEX update
- [x] All 8 code commits + 1 docs commit pushed la origin/main

---

## Files created

- `lib/compliance/fria-schema.ts` — 6 secțiuni, ~20 întrebări, Art. 27 referințe
- `lib/compliance/fria-schema.test.ts` — 6+ teste
- `lib/compliance/fria-trigger.ts` — pure function `evaluateFriaRequirement(system, orgRegulatoryProfile)`
- `lib/compliance/fria-trigger.test.ts`
- `lib/compliance/fria-evaluator.ts` — risk matrix + finding emission + markdown gen
- `lib/compliance/fria-evaluator.test.ts` — 8+ teste
- `lib/server/fria-store.ts` — adapter: createFria, updateFria, deleteFria, listFria, markFriaApproved, markFriaRejected, notifyAuthority, reuseDpia
- `lib/server/fria-store.test.ts` — 8+ teste
- `app/api/fria/route.ts` — GET list + POST create
- `app/api/fria/[id]/route.ts` — GET + PATCH + DELETE
- `app/api/fria/[id]/export/route.ts` — markdown + PDF (Sprint 014)
- `app/api/fria/[id]/notify-authority/route.ts` — POST mark notified
- `app/api/fria/[id]/approve/route.ts` — POST approve
- `app/api/fria/[id]/reject/route.ts` — POST reject + reason
- `app/api/fria/trigger-check/route.ts` — POST {systemId} → returns trigger result
- `app/dashboard/fria/page.tsx` — REWRITE complet (replace ComingSoonPage): stats + filter + 6-step wizard modal + per-record detail expand cu risk matrix
- `docs/sprints/sprint-016-fria-art-27.md` — acest fișier

## Files modified

- `lib/compliance/types.ts` — adăugat: `FriaDeployerType`, `FriaRecordStatus`, `FriaRiskLevel`, `FundamentalRight` (24 drepturi din EU Charter), `FriaAffectedGroup`, `FriaRiskAssessment`, `FriaHumanOversightMeasure`, `FriaRecord`; extins `ComplianceState.friaRecords?`
- `app/dashboard/sisteme/page.tsx` — fetch /api/fria + calculează systemsRequiringFriaIds + propagă la AISystemsList pentru banner Art. 27
- `components/ai-act/ai-systems-list.tsx` — render banner FRIA pentru sistemele high-risk fără FRIA record
- `lib/server/audit-pack-builder.ts` — adăugat secțiune `fria/registry.md` + `fria/records/{id}.md`; manifest extins cu SHA-256 pentru noile fișiere; hash chain integrity preserved
- `lib/server/feature-gates.ts` — `fria_generator` feature acum vizibil pentru cabinet (mandate § 16)
- `components/shell/nav-config.ts` — scos `badge: "coming-soon"` de pe FRIA item + mutat section "builder" → "compliance"
- `tests/audit-pack-builder-sprint-011.test.ts` — extins cu FriaRecord în sample state; verifică fria/ section + chain integrity
- `components/shell/nav-config.test.ts` — assertion update: cabinet DOES see FRIA
- `lib/server/feature-gates.test.ts` — same alignment

## Files removed

- — (none; placeholder ComingSoonPage replaced inline)

---

## Schema changes

- **Supabase:** nimic (folosim `org_state.friaRecords[]` JSONB)
- **State extension:** `ComplianceState.friaRecords?: FriaRecord[]` (opțional)
- **Backward compat:** state-uri vechi fără friaRecords continuă să funcționeze (undefined tratat ca [])

---

## Tests

- `npx tsc --noEmit`: clean (0 errors)
- `npm run build`: clean — toate rutele FRIA registrate (`/api/fria`, `[id]`, `export`, `notify-authority`, `approve`, `reject`, `trigger-check`, `/dashboard/fria`)
- `npx vitest run`: **615/615 pass** (was 548 before sprint 016 = +67 noi teste pe FRIA module + 1 extins pe audit-pack-builder)
- Live test: pending după push (Vercel auto-deploy)

---

## Decisions made

- **24 fundamental rights catalog** mapat din EU Charter of Fundamental Rights (Art. 1-47 selectate cu relevanță AI: dignity, integrity, privacy, data protection, non-discrimination, effective remedy, etc.). Sursa: Carta Drepturilor Fundamentale a Uniunii Europene (2012/C 326/02).
- **Trigger heuristici** per Art. 27(1)(a)(b) + Annex III: public bodies, private entities providing public services, credit assessment deployers, life/health insurance pricing, HR screening, biometric identification.
- **Art. 27(4) DPIA reuse** implementat via `reuseDpia()` — leagă DpiaRecord existent de FRIA, evită duplicare evaluări.
- **Risk matrix likelihood × severity → riskLevel** (5×5 grid → 4 niveluri: low/medium/high/critical). Per right, deployer setează likelihood + severity + mitigation; engine calculează residualRisk.
- **FRIA shared cabinet** (mandate § 16) — cabinetele prepară FRIA pentru clienții lor deployer (B2B compliance service). Initial section era "builder", mutat în "compliance" pentru cabinet alignment (DPIA/RoPA sunt acolo).
- **PDF export** via Sprint 014 generator (`?format=pdf` on export route).
- **Stable-ID findings** prefixate `fria-{id}-{rule}` — pattern din Sprint 012 pentru idempotent re-evaluation.
- **AI Inventory banner** integrat pe parent page `/dashboard/sisteme` (fetch FRIA records + calcul `systemsRequiringFriaIds`), pasat la `AISystemsList` componentă (banner render în row pentru high-risk fără FRIA).

---

## Concerns / Blockers

- ⚠️ **Subagent overload mid-sprint** — primul dispatch (16-1 → 16-6) a rulat cu success; al doilea (16-7 → 16-9) a primit API Overloaded după 16-7 commit. Completare 16-8/16-9 manual (Claude). Pattern de recovery valid: subagent commit-uri incrementale → cleanup manual de la ultimul commit semnat.
- ⚠️ **AI Inventory banner UX** — banner apare doar dacă fetch /api/fria reușește. Dacă rate-limited sau eroare, banner lipsește silently. Sprint 022 (preventive engine) ar putea include un global state pentru "missing FRIA" + reminder email.
- ⚠️ **Fundamental rights catalog** — am inclus 24 din ~50 articole din Carta; rights legate de azil, copii, vârstnici, dizabilitate sunt incluse, dar pot lipsi nuanțe specifice pentru spațiu academic/cercetare. Iterare cu DPO/expert juridic recomandată în următoarea fază.
- 🚫 **Niciun blocker.** Sprint 017 (Human Oversight Protocols) e unlocked — va reuza `FriaHumanOversightMeasure` type.

---

## Commits

- `3d99e3f` — feat(sprint-16-1): FRIA types + ComplianceState
- `0b4f65f` — feat(sprint-16-2): FRIA schema (6 sections, 24 rights, Art. 27 questions)
- `108b22f` — feat(sprint-16-3): FRIA trigger detection (Art. 27(1)(a)(b))
- `7858812` — feat(sprint-16-4): FRIA evaluator with risk matrix + finding emission + markdown
- `fbdfee5` — feat(sprint-16-5): FRIA store adapter (CRUD + approve/reject/notify/reuseDpia)
- `2b1e71b` — feat(sprint-16-6): FRIA API routes (CRUD + workflow + export + trigger-check)
- `e5e7204` — feat(sprint-16-7): /dashboard/fria UI with 6-step wizard + risk matrix + Inventory banner
- `1de063a` — feat(sprint-16-8): wire FRIA into Audit Pack + nav-config coming-soon removed
- (this commit) — docs(sprint-16): sprint log + INDEX update

## Live URL

- Production: `https://eu-ai-act-beige.vercel.app/dashboard/fria` (după push + Vercel auto-deploy)

---

## Dependencies

**Requires from previous sprints:**
- Sprint 008A (ComplianceState + findings + events + audit trail foundation)
- Sprint 008B (findings cockpit unde FRIA emit findings)
- Sprint 008C (DPIA pentru Art. 27(4) reuse)
- Sprint 011 (audit-pack-builder pattern + extended manifest)
- Sprint 014 (PDF generator pentru export FRIA)
- Sprint 015 (nav-config + role-aware UI + feature gates)

**Unlocks for next sprints:**
- Sprint 017 (Human Oversight Protocols) — va reuza `FriaHumanOversightMeasure` type + extends per Art. 14
- Sprint 019 (Post-Market Monitoring) — FRIA revalidation reminders
- Sprint 022 (Preventive engine) — auto-detect missing FRIA pentru sisteme high-risk + email DPO

---

## Notes pentru următorul agent (Sprint 017 — Human Oversight Protocols)

- **Pattern stabilit:** module BUILD NEW pentru AI Act depth folosesc același template ca FRIA: types → schema → trigger/evaluator → store adapter → API routes → UI page → wire în audit-pack + nav-config.
- **Reuse FriaHumanOversightMeasure** ca starting point pentru Sprint 017 Human Oversight Protocols (Art. 14). HumanOversightProtocol va fi mai detaliat (protocol per sistem AI cu owner + escalation + fallback + contestation procedure), dar tipul `measureType` se păstrează.
- **Subagent overload recovery:** dispatch incremental commits 1→N. Dacă subagent pică la step X, manual cleanup de la commit (X-1). Build pattern: tsc → vitest → npm build → commit → push.
- **Test alignment:** dacă schimbi vizibilitatea unei features între workspaceModes, asigură-te update și pe `feature-gates.test.ts` + `nav-config.test.ts` (sunt teste explicite pentru fiecare mode × feature).
- **PDF export pattern:** toate modulele AI Act depth trebuie să suporte `?format=pdf` via Sprint 014 `pdf-generator.ts`. FRIA face asta în `/api/fria/[id]/export/route.ts` ca referință.
- **Audit pack wire:** pattern din Sprint 011 — add section folder + registry.md + records/{id}.md + update manifest + chain hash. Vezi `lib/server/audit-pack-builder.ts` Sprint 016-8 commit pentru ultima implementare.
