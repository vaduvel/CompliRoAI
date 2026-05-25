# CompliRoAI — Claude Design Port Map

Versiune: 1.0 — 19 mai 2026  
Scop: harta de executie pentru a porta corect designul Claude in produsul CompliRoAI fara sa stricam runtime-ul matur.

## TL;DR

Claude Design a livrat un prototip complet si util, dar este un prototip static. Nu se copiaza direct in produs.

Regula de aur:

> Runtime-ul CompliRoAI ramane sursa de adevar. Claude Design este sursa de intentie vizuala si UX.

Ce portam:
- design language light-first cu dark mode pastrat
- shell polish: sidebar, active rail, mode context, execution banner
- AI Guidance card + drawer explicativ
- Resolve cockpit pattern
- portofoliu triage pattern
- layout-uri bune pentru Annex IV, EU DB, onboarding/intake, audit pack

Ce NU portam:
- `app.jsx` ca router
- `NAV` static din `shell.jsx`
- `cr-*` CSS wholesale
- mock data, token counts, costuri, hashes, nume statice
- `tweaks-panel.jsx`
- duplicate screen-uri care concureaza cu runtime-ul existent

## Surse Inspectate

Design files:
- `_design-claude/styles.css`
- `_design-claude/shell.jsx`
- `_design-claude/ai-orchestrator.jsx`
- `_design-claude/resolve-cockpit.jsx`
- `_design-claude/screens*.jsx`
- `_design-claude/flows.jsx`
- `_design-claude/subflows.jsx`
- `_design-claude/overlays.jsx`
- `_design-claude/public.jsx`
- `_design-claude/settings-sub.jsx`

Runtime relevant:
- `styles/v3-design-system.css`
- `app/globals.css`
- `components/shell/dashboard-shell.tsx`
- `components/shell/nav-config.ts`
- `components/shell/nav-item.tsx`
- `app/dashboard/page.tsx`
- `app/dashboard/resolve/page.tsx`
- `lib/compliance/guidance-orchestrator.ts`
- `lib/compliance/guidance-orchestrator.test.ts`
- `lib/server/audit-pack-builder.ts`

## Non-negotiable

1. Nu se pierde feature gating pe rol/tier.
2. Nu intra fiscal, e-Factura, ANAF, whistleblowing sau pay transparency.
3. UI ramane in romana, ton operational, fara “demo/MVP/placeholder”.
4. AI Guidance nu executa automat. Doar recomanda, explica si priorizeaza.
5. Compliance Gate / Preventive Engine / Findings castiga asupra textului generat de AI.
6. Orice “Mistral”, cost, token count, hash sau sursa apare in UI doar daca exista in runtime.
7. Orice portare vizuala trebuie sa pastreze testele existente pentru nav role gating.

## Decizii Pe Duplicate

| Zona | Duplicate / conflict | Decizie |
|---|---|---|
| Router prototip | `app.jsx` are routing static, cazuri duplicate si pagini unreachable | Ignorat ca runtime. Folosit doar ca index vizual. |
| Sidebar / nav | `shell.jsx` are `NAV` static, runtime are `nav-config.ts` cu role/tier gates | Runtime castiga. Portam doar polish vizual. |
| Design tokens | `styles.css` are tokeni light-first, runtime are `v3-design-system.css` | Fuzionam selectiv alias-uri, nu importam `styles.css` wholesale. |
| Clase CSS | prototipul foloseste `cr-*`, runtime are `cs-*` | Nu cream doua DS-uri. Extindem `cs-*`. |
| Acasa | `ScreenCockpit` + `AIGuidanceCard` | `AIGuidanceCard` devine modul real peste dashboard; `ScreenCockpit` ramane inspiratie. |
| Findings | `ScreenFindings` vs `resolve-cockpit.jsx` | `resolve-cockpit.jsx` este canonical. `ScreenFindings` este legacy list. |
| Portofoliu / Clienti | prototipul refoloseste `ScreenPortfolio` pentru ambele | Portofoliu = triage cross-client. Clienti ramane pagina separata runtime. |
| Role vs Conformity | `ScreenRoleAssessment` si `ScreenConformity` se suprapun partial | Se pastreaza separat: role/scoping vs conformity workflow. |
| Annex IV vs EU Database | ambele se duc in runtime spre `/dashboard/sisteme/eu-db-wizard` | Trebuie tratate ca flow/tab-uri distincte in aceeasi zona sau rute clare. |
| Trust Center | dashboard config vs public page | Ambele valide. Nu se unifica. |
| Logging Evidence vs Audit Log | ambele par “logging” | Separate: Art. 12 evidence vs jurnal platforma. |
| DSAR | `ScreenDSAR` + `SubflowDSARHandler` | Lista/queue + execution flow. Nu sunt duplicate reale. |
| Settings billing | `screens7.jsx` + `settings-sub.jsx` | Runtime billing castiga. Subpagini extra doar daca exista rute reale. |
| DPA signing public | `PublicDPASigning` fara ruta clara | Later, doar daca se leaga de `/dpa` sau `/share/[token]`. |
| Tweaks panel | control panel de prototip | Nu intra in produs. |

## Portare Pe Zone

### Zona 1 — Foundation DS + Shell

Sursa design:
- `_design-claude/styles.css`
- `_design-claude/shell.jsx`

Runtime:
- `styles/v3-design-system.css`
- `components/shell/dashboard-shell.tsx`
- `components/shell/nav-item.tsx`
- `components/shell/nav-config.ts`

Implementare:
- Adauga tokeni light-first compatibili in `v3-design-system.css`, fara sa stergi dark V3.
- Pastreaza `--bg`, `--ink`, `--cobalt-*`, `--red-*`, `--amber-*`, `--emerald-*`, dar adauga alias-uri pentru paper/surface/stripe/focus.
- Refactorizeaza shell-ul din inline styles spre `.cs-*` classes.
- Active nav trebuie sa aiba cobalt rail + icon accent + text clar.
- Sidebar trebuie sa suporte context cabinet: `Portofoliu · triaj` si `Executie · firma`.
- Nu copia `NAV` din prototip.

Definition of Done:
- `getNavForRole()` ramane singura sursa de nav.
- Testele `nav-config` si `feature-gates` raman verzi.
- Light mode arata ca screenshot-urile Claude, dar fara sa pierdem dark mode.

### Zona 2 — AI Guidance Orchestrator UI

Sursa design:
- `_design-claude/ai-orchestrator.jsx`

Runtime:
- `lib/compliance/guidance-orchestrator.ts`
- `lib/compliance/guidance-orchestrator.test.ts`
- `app/dashboard/page.tsx`
- viitor `lib/server/guidance-store.ts`
- viitor `app/api/ai-guidance/route.ts`

Implementare:
- Cardul “Plan de lucru AI” se leaga de `GuidancePlan.actions`.
- `Plan complet` deschide drawer cu `actions + omittedActions`.
- Drawer-ul arata:
  - de ce itemul este #1
  - articole consultate
  - owner recomandat
  - unde apesi in aplicatie
  - ce dovezi sunt necesare
  - confidence/guardrails
  - omisiuni si explicatii
  - comparatie plan anterior vs plan curent
- `Aproba & prioritizeaza` salveaza snapshot, nu inchide findings.
- `Respinge plan` salveaza decizie in audit.
- `Regeneraza` construieste plan nou si compara cu cel anterior.
- Dupa orice actiune majora in Resolve, se regenereaza planul.

Nu porta:
- planurile static-role din prototip
- `Mistral Large`, `47K tokens`, costuri, hash-uri, useri si firme mock daca nu exista runtime data
- label “hash” criptografic peste `stableFingerprint()`

Definition of Done:
- `GET /api/ai-guidance` returneaza plan real.
- `POST /api/ai-guidance` suporta `regenerate`, `accept`, `reject`, `export`.
- Snapshot-ul planului apare in Audit Pack.
- Cand rezolvi un finding, planul urmator il scoate sau il muta in istoric.
- Userul poate vedea “De ce AI a omis X?”.
- Userul poate vedea “Plan ieri vs azi”.

### Zona 3 — Resolve Cockpit

Sursa design:
- `_design-claude/resolve-cockpit.jsx`

Runtime:
- `app/dashboard/resolve/page.tsx`
- `app/api/findings/*`
- `lib/server/findings-store.ts`

Implementare:
- Pastreaza runtime lifecycle existent: confirma, respinge, rezolva, evidence, share, delete, audit trail.
- Adauga AI Guidance banner in expanded finding.
- Daca URL are `/dashboard/resolve?finding=id`, extinde automat finding-ul respectiv.
- Butonul din plan deschide direct finding-ul.
- Dupa attach evidence / mark resolved / dismiss / create / delete, re-fetch guidance plan.
- Nu rescrie filtrele daca runtime-ul merge deja.

Atentie:
- Nu expune `E_FACTURA`.
- `NIS2` apare doar daca este AI-slice relevant si permis, nu ca framework full.

Definition of Done:
- Din dashboard: `Deschide` pe item AI Guidance ajunge in finding corect.
- Finding expandat arata pasul AI recomandat.
- Actiunea userului actualizeaza planul.

### Zona 4 — Portfolio Triage

Sursa design:
- `_design-claude/screens.jsx:ScreenPortfolio`

Runtime:
- `app/dashboard/portofoliu/page.tsx`
- `app/dashboard/clienti/page.tsx`

Implementare:
- Portofoliu este triage cross-client pentru cabinet.
- Clienti ramane management client list / intake context.
- Introdu KPI strip compact: firme active, findings critice, high-risk AI, scor mediu, task-uri active.
- Tabelul trebuie sa prioritizeze “Intra in executie”.

Definition of Done:
- Cabinet vede clar doua moduri: triaj portofoliu si executie firma.
- Nu se confunda “clienti” cu “portofoliu”.

### Zona 5 — Annex IV / EU Database / Conformity

Sursa design:
- `_design-claude/screens2.jsx:ScreenAnnexIV`
- `_design-claude/screens7.jsx:ScreenEUDb`
- `_design-claude/screens3.jsx:ScreenConformity`
- `_design-claude/subflows.jsx:SubflowAnnexIVEditor`

Runtime:
- `app/dashboard/conformitate/page.tsx`
- `app/dashboard/sisteme/eu-db-wizard/page.tsx`

Problema:
- Runtime nav mapeaza Annex IV si EU Database spre aceeasi ruta.

Decizie:
- Nu cream duplicate. Ori se pastreaza o ruta cu tabs clare, ori se separa rutele ulterior.

Implementare:
- `Conformity Assessment` = checklist/10Q + verdict.
- `Annex IV` = documentatie tehnica.
- `EU Database` = wizard depunere/inregistrare.

Definition of Done:
- AI Builder intelege in 5 secunde diferenta intre cele 3.
- Nu exista doua butoane care duc in acelasi flow fara context.

### Zona 6 — Client Intake / Magic Links / DPA Signing

Sursa design:
- `_design-claude/screens6.jsx:ScreenIntake`
- `_design-claude/subflows.jsx:SubflowAddClient`
- `_design-claude/flows.jsx:PublicDPASigning`
- `_design-claude/overlays.jsx:RequestDPAModal`

Runtime:
- `app/dashboard/client-intake/page.tsx`
- `app/dpa/page.tsx`
- `app/share/[token]/page.tsx`

Implementare:
- `ScreenIntake` este canonical pentru client intake.
- `SubflowAddClient` se foloseste doar ca wizard daca runtime-ul cere.
- Public DPA signing se leaga doar daca exista token flow real.

Definition of Done:
- Cabinet poate cere date client si vendor DPA fara confuzie.
- Public signing are audit event si token expiry.

### Zona 7 — Public / Landing / Trust

Sursa design:
- `_design-claude/public.jsx`
- `_design-claude/CompliRoAI.html`
- `_design-claude/DS-Reference.html`

Runtime:
- `app/page.tsx`
- `app/(auth)/login/page.tsx`
- `app/onboarding/page.tsx`
- `app/verify-pack/page.tsx`
- `app/share/[token]/page.tsx`

Implementare:
- Public pages se porteaza dupa ce dashboard-ul operational este stabil.
- Landing trebuie sa vanda “learn vs do” fara sa copieze Skillab.
- Trust Center public si PDF preview sunt separate de Audit Pack editor.

Definition of Done:
- Public route explica clar buyerii: cabinet, IMM, AI Builder.
- Nu promite automatizari care nu exista in produs.

## Ordine Recomandata

### Sprint DS-01 — Shell + Tokens

Output:
- light mode foundation
- dark mode pastrat
- shell refactor catre `.cs-*`
- nav active state premium

De ce primul:
- toate paginile vor mosteni stilul.
- fara asta portam fiecare pagina cu inline chaos.

### Sprint AI-01 — Guidance Store + API

Output:
- `guidance-store.ts`
- `/api/ai-guidance`
- plan snapshot
- audit event pentru accept/reject/regenerate/export
- Audit Pack section

De ce inainte de UI:
- cardul design trebuie sa citeasca state real, nu mock.

### Sprint AI-02 — Guidance Card + Drawer

Output:
- card pe `/dashboard`
- drawer “Plan complet”
- omitted explanations
- plan diff
- guardrails vizibile

### Sprint AI-03 — Resolve Cockpit Integration

Output:
- deep link `?finding=id`
- per-finding guidance banner
- after-action regenerate
- plan update after evidence/resolution

### Sprint UI-02 — Portfolio Triage + Execution Mode

Output:
- portfolio triage polish
- execution banner
- clear mode split for cabinet

### Sprint UI-03 — Annex IV / EU DB / Conformity Clarity

Output:
- no duplicate route confusion
- tab/flow separation
- AI Builder clarity

## Brief Pentru Agenti / Sesiuni Separate

### Agent A — Shell + Tokens

Scope:
- `styles/v3-design-system.css`
- `components/shell/dashboard-shell.tsx`
- `components/shell/nav-item.tsx`

Instructions:
- Nu modifica `nav-config.ts` decat daca este strict label polish.
- Nu copia `cr-*`.
- Nu copia `NAV`.
- Refactor inline shell styles in clase `.cs-*`.
- Pastreaza role/tier gating intact.

Checks:
- `npx vitest run components/shell/nav-config.test.ts lib/server/feature-gates.test.ts`
- `npx tsc --noEmit`
- browser visual check desktop + narrow.

### Agent B — AI Guidance Runtime

Scope:
- `lib/server/guidance-store.ts`
- `app/api/ai-guidance/route.ts`
- `lib/compliance/types.ts`
- `lib/server/audit-pack-builder.ts`
- tests pentru store/API/Audit Pack

Instructions:
- Planner determinist ramane sursa de adevar.
- Nu face Mistral obligatoriu.
- Nu loga fiecare page load.
- Audit events doar pentru regenerate/accept/reject/export.
- Snapshot in state sau events + compact plan artifact.

Checks:
- plan after resolved finding removes/reprioritizes item
- omitted action explanation works
- diff previous/current works
- Audit Pack includes AI Guidance.

### Agent C — AI Guidance UI + Resolve

Scope:
- `app/dashboard/page.tsx`
- `app/dashboard/resolve/page.tsx`
- new shared component(s) under `components/ai-guidance/`

Instructions:
- Port visual pattern from `ai-orchestrator.jsx`, but dynamic.
- Port resolve banner pattern from `resolve-cockpit.jsx`, but do not duplicate runtime filters/actions.
- Support `?finding=id`.
- After lifecycle actions, re-fetch plan.

Checks:
- browser click: dashboard plan item -> resolve expanded finding
- mark resolved -> plan changes
- drawer opens, omitted explanation visible
- no fake Mistral/token/cost unless backend returns it.

### Agent D — Design Duplicate Cleanup

Scope:
- no runtime edits unless asked
- create checklist of remaining pages to polish

Instructions:
- For every page, choose canonical design source.
- Mark `ignore`, `later`, `now`.
- Do not create new pages from unreachable prototype routes.

## Known Risks

1. Importing prototype CSS wholesale can flip the whole app into an uncontrolled theme.
2. Keeping inline runtime styles will make token changes ineffective.
3. Copying static AI Guidance creates stale plan, exactly what Claude Design warned about.
4. Porting `ScreenFindings` plus `resolve-cockpit` creates two versions of the same workflow.
5. Annex IV and EU DB currently collide on route; must be clarified before heavy polish.
6. Stable fingerprint is not cryptographic; do not present it as legal hash proof.
7. Event ledger has cap; avoid audit spam on every page load.

## Immediate Next Step

Start with Sprint AI-01 if product intelligence matters first.

Start with Sprint DS-01 if visual polish must land first.

Recommended:

> Sprint AI-01 + AI-02 first, because orchestrator changes product value. Then DS-01 applies the new visual language globally.

Rationale:
- Design without orchestrator runtime would be pretty but hollow.
- Orchestrator runtime can be tested immediately against real state.
- DS port can then style a real feature, not static screenshots.
