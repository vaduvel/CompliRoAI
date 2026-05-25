# Sprint 028 — Light DS + AI Guidance UX Polish

**Status:** DONE (local, uncommitted)  
**Faza:** 5 — UI maturity / product polish  
**Start:** 2026-05-19  
**End:** 2026-05-19  
**Owner:** manual: Codex

---

## Goal

Aplică direcția Claude Design light-first peste runtime-ul CompliRoAI și aduce AI Guidance Orchestrator mai aproape de flow-ul real de execuție: plan vizibil, explicabil, role-aware și ușor de urmărit în cockpit.

---

## Scope

- [x] Păstrează arhitectura locked: `imm-classic`, `ai-builder`, `cabinet`.
- [x] Nu adaugă vertical products și nu schimbă feature-gating.
- [x] Nu schimbă verdictul legal determinist al Compliance Gate / Preventive Engine / Findings.
- [x] Port light-first DS tokens în runtime fără să rescrie toate paginile.
- [x] Adaugă compatibilitate Tailwind v4 / shadcn semantic tokens.
- [x] Polishează shell-ul: sidebar, logo, badge, workspace ribbon, sticky context.
- [x] Polishează dashboard home: layout mai lat, heading, cards, spacing.
- [x] Polishează `GuidancePlanPanel`: card work-plan, drawer focused, metadata, owner/effort, omissions, diff, guardrails.
- [x] Adaugă AI Guidance inline în expanded finding din Resolve, ca DPO-ul să vadă pasul sugerat chiar în cockpit.
- [x] Păstrează `_design-claude/` ca material brut necomis/curat, nu ca production source.

---

## Files modified

- `styles/v3-design-system.css` — light-first runtime override + dark mode fallback + Tailwind v4 semantic bridge.
- `components/shell/dashboard-shell.tsx` — shell light, brand mark, notification badge, workspace ribbon, `100dvh`.
- `components/shell/nav-item.tsx` — active state light-first cu cobalt border + badge severity.
- `components/shell/workspace-switcher.tsx` — light paper surfaces + shadow.
- `app/dashboard/page.tsx` — dashboard home wide layout + visual polish.
- `components/ai-guidance/guidance-plan-panel.tsx` — card/drawer polish, owner/effort, fingerprint, better hierarchy.
- `app/dashboard/resolve/page.tsx` — inline AI guidance card în expanded finding.
- `docs/sprints/INDEX.md` — Sprint 028 entry.
- `docs/sprints/sprint-028-light-ds-ai-guidance-polish.md` — acest log.

---

## Decisions

- **Decision A — light default:** România/CEE buyer context cere default light mode. Dark mode rămâne fallback tokenizat, dar nu este default runtime.
- **Decision B — DS as compatibility layer first:** Nu rescriem toate cele 39+ dashboard pages într-un singur sprint. Începem cu tokenii + shell + dashboard + orchestrator, ca restul paginilor să migreze incremental fără drift.
- **Decision C — AI Guidance in execution context:** Planul complet rămâne dashboard-level, dar expanded finding primește un guidance card local ca user-ul să înțeleagă pasul imediat.
- **Decision D — no invented metadata:** UI afișează `modelLabel`, `promptVersion`, `fingerprint`, candidate count și state-derived facts. Nu inventăm token cost sau context window dacă backend-ul nu le persistă.
- **Decision E — raw Claude prototype stays raw:** `_design-claude/` este referință, nu production code. Portarea se face prin componente și tokeni production-safe.

---

## Tests

- `npx tsc --noEmit`: clean.
- `npm run build`: clean; `/dashboard`, `/dashboard/resolve`, `/api/ai-guidance` incluse în build.
- `npx vitest run`: 1343/1343 pass (98 files).
- `npx playwright test --config .qa-screenshots/playwright.config.js --workers=1`: 6/6 pass.
- Feature completeness: PASS — API-ul `/api/ai-guidance` are UI montat în dashboard, context inline în Resolve, audit trail, Audit Pack export și store testat.
- Browser visual QA: PASS pe `localhost:3001/dashboard` după restart curat al serverului local; CSS bundle prezent, light DS aplicat, AI Guidance card vizibil.
- Deep UI E2E: PASS — `imm-classic` creează AI system + AI Literacy record; `ai-builder` creează Logging Evidence din banner Art. 12; `cabinet` creează client portofoliu + magic link approval handoff.

### QA addendum — 2026-05-25

- Am reparat mesajul de handoff din `AISystemsList`: UI spune `Magic link trimis` doar când emailul pleacă prin Resend; în dev/console/fallback spune `Magic link creat`, ca să nu promitem fals delivery.
- E2E-ul Cabinet acceptă promptul de email și verifică linkul `/share/...` generat din UI.
- Notă de disciplină QA: nu rula `next build` în paralel cu Playwright pe `next start`, pentru că build-ul rescrie `.next` și poate face `/login` instabil temporar.

### Browser note

În timpul QA, serverul vechi de pe `localhost:3001` a rămas stale după build/hot reload și servea HTML cu link către `/_next/static/css/app/layout.css`, dar acel asset răspundea `404`. Simptomul a fost pagină fără CSS, font serif implicit și layout brut. Restart curat al dev serverului a regenerat CSS bundle-ul și a confirmat că problema nu era în runtime code.

---

## Follow-up

- Migrare incrementală DS pe paginile cu cele mai multe inline styles: `/dashboard/resolve`, `/dashboard/portofoliu`, `/dashboard/ai-ads`, `/dashboard/api-sdk`.
- Dark mode toggle real poate fi adăugat după ce light runtime este stabil.
- Mistral-backed explanation layer rămâne sprint separat, peste orchestratorul determinist deja implementat.
