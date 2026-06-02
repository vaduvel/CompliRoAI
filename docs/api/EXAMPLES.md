# CompliRoAI API v1 — Examples

Examples for integrating `/api/v1` into common workflows.

## TypeScript SDK

```ts
import { CompliRoAIClient } from "@compliroai/client"

const client = new CompliRoAIClient({
  apiKey: process.env.COMPLIROAI_KEY!,
  // baseUrl defaults to the production deployment, override for staging:
  // baseUrl: "https://staging.compliroai.example.com",
})

// 1. Classify a system (no side effects on org state).
const cls = await client.classify({
  systemName: "Credit Risk Engine",
  purpose: "credit-scoring",
  sector: "fintech",
  processesPersonalData: true,
  vendorRegion: "EU",
  modelProvider: "OpenAI",
  dpaSigned: true,
})
console.log(cls.riskClass) // "high"
console.log(cls.aiActArticle) // "Annex III 5(b)"

// 2. Run gate (preferred — emits compliance verdict).
const gate = await client.gate({
  systemName: "Credit Risk Engine",
  purpose: "credit-scoring",
  processesPersonalData: true,
  dpaSigned: true,
  humanOversightDocumented: true,
  loggingEnabled: true,
  evidence: { dpiaCompleted: true },
})

if (gate.verdict === "blocked") {
  console.error("BLOCKED:", gate.reasons.map((r) => r.message))
  process.exit(1)
}

// 3. Register the deployment — emits findings to the cockpit if non-pass.
await client.registerDeployment({
  systemName: "Credit Risk Engine",
  purpose: "credit-scoring",
  processesPersonalData: true,
  dpaSigned: true,
  humanOversightDocumented: true,
  loggingEnabled: true,
  deploymentRef: process.env.GITHUB_SHA ?? "local-dev",
})
```

## curl

```bash
# Classify
curl -X POST "$BASE_URL/api/v1/classify" \
  -H "Authorization: Bearer $COMPLIROAI_KEY" \
  -H "Content-Type: application/json" \
  -d '{"systemName":"HR Bot","purpose":"hr-screening"}'

# Gate with evidence block
curl -X POST "$BASE_URL/api/v1/gate" \
  -H "Authorization: Bearer $COMPLIROAI_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "systemName": "HR Bot",
    "purpose": "hr-screening",
    "humanOversightDocumented": true,
    "loggingEnabled": true,
    "processesPersonalData": true,
    "dpaSigned": true,
    "evidence": { "friaCompleted": true, "dpiaCompleted": true }
  }'

# Deployment
curl -X POST "$BASE_URL/api/v1/deployment" \
  -H "Authorization: Bearer $COMPLIROAI_KEY" \
  -H "Content-Type: application/json" \
  -d '{"systemName":"HR Bot","purpose":"hr-screening","deploymentRef":"sha-abc123"}'
```

## Node — without SDK (stdlib fetch)

```js
const res = await fetch("https://api.example/api/v1/gate", {
  method: "POST",
  headers: {
    authorization: `Bearer ${process.env.COMPLIROAI_KEY}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({ systemName: "Bot", purpose: "support-chatbot" }),
})
const gate = await res.json()
if (!res.ok) throw new Error(`${gate.code}: ${gate.error}`)
console.log(gate.verdict)
```

## Python (urllib, stdlib only)

```python
import json
import os
import urllib.request
import urllib.error

def gate(system_name: str, purpose: str, **extra) -> dict:
    body = {"systemName": system_name, "purpose": purpose, **extra}
    req = urllib.request.Request(
        "https://eu-ai-act-beige.vercel.app/api/v1/gate",
        method="POST",
        headers={
            "Authorization": f"Bearer {os.environ['COMPLIROAI_KEY']}",
            "Content-Type": "application/json",
        },
        data=json.dumps(body).encode(),
    )
    try:
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read())
    except urllib.error.HTTPError as e:
        body = json.loads(e.read())
        raise RuntimeError(f"{body.get('code')}: {body.get('error')}") from e

result = gate("HR Bot", "hr-screening", humanOversightDocumented=True)
if result["verdict"] != "pass":
    raise SystemExit(f"Gate failed: {result['reasons'][0]['message']}")
```

## GitHub Actions — block deployment on review/blocked

```yaml
name: Compliance Gate
on: [pull_request]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run compliance gate
        env:
          COMPLIROAI_KEY: ${{ secrets.COMPLIROAI_KEY }}
        run: |
          response=$(curl -s -X POST "https://eu-ai-act-beige.vercel.app/api/v1/gate" \
            -H "Authorization: Bearer $COMPLIROAI_KEY" \
            -H "Content-Type: application/json" \
            -d '{
              "systemName": "${{ github.repository }}",
              "purpose": "${{ vars.AI_PURPOSE }}",
              "deploymentContext": "preview",
              "humanOversightDocumented": true
            }')
          echo "$response"
          verdict=$(echo "$response" | jq -r .verdict)
          if [ "$verdict" != "pass" ]; then
            echo "::error::Compliance Gate verdict: $verdict"
            exit 1
          fi
```

## GitLab CI — non-blocking informative job

```yaml
compliance-gate:
  stage: validate
  image: alpine:3.20
  before_script:
    - apk add --no-cache curl jq
  script:
    - |
      curl -s -X POST "$BASE_URL/api/v1/deployment" \
        -H "Authorization: Bearer $COMPLIROAI_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"systemName\":\"$CI_PROJECT_NAME\",\"purpose\":\"document-assistant\",\"deploymentRef\":\"$CI_COMMIT_SHA\"}" \
        | tee gate.json
      jq -r .gate.verdict gate.json
  artifacts:
    paths: [gate.json]
  allow_failure: true
```
