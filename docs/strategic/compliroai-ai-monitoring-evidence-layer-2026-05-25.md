# CompliRoAI AI Monitoring & Evidence Layer

**Data:** 2026-05-25  
**Status:** LOCKED ROADMAP, de implementat dupa stabilizarea DS + flow-uri E2E  
**Workspace-uri afectate:** `imm-classic`, `ai-builder`, `cabinet`  
**Pozitionare:** CompliRoAI nu inlocuieste stack-ul tehnic de MLOps/logging al clientului. Il transforma in evidence AI Act + GDPR, cu audit trail, task-uri, roluri si Audit Pack.

---

## Decizie

Dupa stabilizarea celor doua lucruri active acum:

1. **DS/UI complet pe toate suprafetele aplicatiei**
2. **QA end-to-end pe flow-urile existente cu demo data**

intram in modulul **AI Monitoring & Evidence Layer**.

Scopul nu este sa construim din prima o platforma MLOps completa de tip Arize / WhyLabs / Grafana / MLflow. Scopul este mai vandabil si mai aliniat cu AI Act:

```text
Transformam schimbari de cod, configuratie, runtime logs, model metrics si security signals in dovezi auditabile AI Act + GDPR.
```

---

## De ce conteaza

Piata de consultanta AI Act se muta de la "raport frumos" la "livrabile auditabile".

Un consultant/builder matur poate avea deja:

- model monitoring intern;
- Grafana / Prometheus / MLflow / LangSmith / Evidently / Arize / WhyLabs;
- loguri de productie;
- drift detection;
- security monitoring;
- dashboard-uri tehnice.

CompliRoAI trebuie sa devina stratul care ia aceste dovezi si le leaga de:

- AI Act Art. 11 technical documentation;
- AI Act Art. 12 logging;
- AI Act Art. 13 instructions for use;
- AI Act Art. 14 human oversight;
- AI Act Art. 15 accuracy / robustness / cybersecurity;
- AI Act Art. 72 post-market monitoring;
- AI Act Art. 73 serious incident reporting;
- GDPR DPIA / RoPA / lawful basis / processor evidence, cand exista date personale.

---

## Cele 5 piese de implementat

### 1. Repo / Config Drift Monitor

**Sursa:** port selectiv din CompliScan mare.

Functionalitate:

- scaneaza `package.json`, lockfiles, `requirements.txt`, `pyproject.toml`;
- scaneaza un fisier declarativ nou: `compliroai.yaml` sau `ai-compliance.yaml`;
- detecteaza provider AI nou, model nou, framework nou, human review scos, personal data introdus, risk class schimbat, purpose schimbat, data residency schimbata;
- compara cu baseline aprobat;
- emite drift, finding, evidence request si actiune in AI Guidance.

Output-uri:

- drift record;
- AI system update;
- finding / action;
- Audit Pack section;
- AI Guidance regeneration trigger.

### 2. Monitoring Maturity per AI System

Fiecare sistem AI trebuie sa aiba un nivel de maturitate monitoring/logging.

Niveluri:

| Level | Nume | Ce inseamna | Vanzabil catre |
| --- | --- | --- | --- |
| 1 | Manual evidence upload | utilizatorul incarca dovezi manuale / proceduri / screenshot-uri | IMM, cabinet, deployer early |
| 2 | Repo/config drift monitor | CompliRoAI detecteaza schimbari in cod/config/provider/model | AI builder, agency, consultant tech |
| 3 | Runtime logging checklist | clientul documenteaza ce evenimente logheaza si unde | deployer matur, provider light |
| 4 | Model metrics / drift / bias evidence | se ataseaza metrici, evaluari, drift, bias, performance | high-risk builder/provider |
| 5 | Security monitoring / prompt injection / incident alerts | se ataseaza security signals, LLM abuse, data leakage, incident alerts | provider matur, enterprise, regulated |

Regula de produs:

```text
Nu mintim ca avem MLOps complet daca sistemul este doar Level 1 sau Level 2.
Aratam maturitatea reala si ce lipseste pentru urmatorul nivel.
```

### 3. Runtime Logging Contract

Definim o schema/API minima prin care clientul, builderul sau infrastructura lor poate trimite evenimente auditabile.

Nu trebuie sa colectam prompt-uri sensibile by default. Colectam dovada operationala:

- AI system id;
- provider;
- model;
- model version;
- timestamp;
- environment: `dev`, `staging`, `production`;
- input category, nu neaparat continut brut;
- output category, nu neaparat continut brut;
- human review required/completed;
- confidence / risk score daca exista;
- error / fallback;
- escalation flag;
- incident candidate flag;
- evidence hash / external log reference.

Output-uri:

- logging evidence pentru Art. 12;
- PMM data source pentru Art. 72;
- incident trigger pentru Art. 73;
- AI Guidance action cand logging-ul lipseste sau se degradeaza.

### 4. Monitoring Evidence Inbox

CompliRoAI trebuie sa accepte dovezi din stack-uri externe, fara sa forteze clientul sa renunte la ele.

Surse posibile:

- CSV upload;
- API push;
- JSON evidence upload;
- Grafana screenshot/export;
- MLflow run export;
- LangSmith trace summary;
- Evidently report;
- Arize/WhyLabs metrics export;
- OpenTelemetry-style event summary.

Regula:

```text
Stack-ul tehnic ramane la client. CompliRoAI normalizeaza dovada, o leaga de articol, owner, deadline si Audit Pack.
```

### 5. Orchestrator Reads Monitoring

AI Guidance Orchestrator trebuie sa tina cont de monitoring.

Trigger-e care regenereaza planul:

- provider/model/framework schimbat;
- baseline drift aparut;
- human oversight eliminat;
- logging coverage scade sub nivelul cerut;
- incident candidate aparut;
- PMM anomaly nerezolvata;
- metric drift / bias evidence peste prag;
- security signal: prompt injection, data leakage, unauthorized access, abnormal output.

Output:

- plan nou;
- diff fata de planul precedent;
- explicatie "de ce a urcat actiunea X";
- evidence request;
- owner sugerat: DPO / Legal / IT / Security / Product / Cabinet.

---

## Scope explicit

### Facem

- compliance-as-code pentru AI stack;
- baseline si drift detection;
- evidence layer pentru logging / PMM / incidents;
- maturity scoring pe fiecare AI system;
- inbox pentru monitoring evidence extern;
- AI Guidance regeneration pe baza drift/monitoring;
- Audit Pack export pentru toate dovezile.

### Nu facem in V1

- full MLOps platform;
- live model serving;
- inlocuire Grafana / MLflow / LangSmith / Arize / WhyLabs;
- red-teaming complet automatizat;
- runtime monitoring universal pentru orice model;
- certificare AI Act;
- promisiune "guaranteed compliant".

---

## Fit pe workspace-uri

### `imm-classic`

Mesaj:

```text
Iti aratam ce nivel de logging/monitoring poti demonstra azi si ce lipseste pentru audit.
```

Focus:

- manual evidence;
- vendor logs;
- AI literacy evidence;
- transparency;
- DPIA/FRIA trigger;
- Audit Pack.

### `ai-builder`

Mesaj:

```text
Livreaza fiecare automatizare AI cu repo/config drift, logging contract si client handover pack.
```

Focus:

- repo/config monitor;
- role-switch alert;
- provider/deployer split;
- runtime logging contract;
- instructions for use;
- handover evidence.

### `cabinet`

Mesaj:

```text
Transforma dovezile tehnice ale clientului in dosar AI Act + GDPR auditabil.
```

Focus:

- multi-client monitoring maturity;
- evidence requests;
- review/approval trail;
- white-label Audit Pack;
- reusable templates.

---

## Implementare propusa

### Sprint 029 — AI Monitoring & Evidence Foundation

- Port selectiv din CompliScan:
  - repo sync;
  - manifest autodiscovery;
  - yaml schema;
  - compliance drift policy.
- Creeaza schema `ai-compliance.yaml`.
- Creeaza `MonitoringMaturityProfile`.
- Adauga drift -> finding -> AI Guidance trigger.
- Audit Pack: `monitoring/`, `repo-drift/`, `runtime-logging/`.

### Sprint 030 — Runtime Logging Contract + Evidence Inbox

- API pentru runtime events.
- CSV/JSON evidence upload.
- External evidence references.
- Logging coverage evaluator.
- PMM + incident bridges.

### Sprint 031 — Monitoring-Aware Orchestrator

- Orchestrator citeste monitoring maturity, drift si runtime events.
- Plan diff explica schimbarile.
- Drawer "surse monitoring consultate".
- Owner/action routing pe DPO / IT / Security / Product / Cabinet.

---

## Success criteria

Produsul devine credibil daca putem spune:

```text
CompliRoAI nu doar intreaba daca ai AI.
Detecteaza schimbari in stack-ul AI, verifica daca logging-ul si monitoring-ul sunt demonstrabile, si transforma dovezile tehnice in audit pack AI Act + GDPR.
```

Nu trebuie sa fim cel mai bun MLOps tool. Trebuie sa fim cel mai bun **compliance evidence layer** peste toolurile MLOps/logging existente.

---

## Decizie finala

Acest modul intra in roadmap. Nu intra inainte de:

1. DS stabilizat pe toate suprafetele;
2. QA E2E final pe toate flow-urile existente.

Dupa aceste doua stabilizari, **AI Monitoring & Evidence Layer** devine urmatorul upgrade major de maturitate.
