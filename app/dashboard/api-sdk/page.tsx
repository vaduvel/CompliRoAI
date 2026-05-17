import { Code } from "lucide-react"
import { ComingSoonPage } from "@/components/shell/coming-soon-page"

export default function APISDKPage() {
  return (
    <ComingSoonPage
      title="API / SDK pentru AI Builders"
      icon={Code}
      sprintNumber={23}
      targetCopy="ianuarie 2027"
      legalReference="Suport tehnic pentru integrarea CompliRoAI în CI/CD-ul AI builderilor — facilitează respectarea Art. 12 + Art. 17 + Art. 72"
      description="API REST + SDK npm care permite AI builderilor să clasifice automat sisteme noi, să trimită metadate de deployment, să primească răspuns compliance gate (allow/block + remediation hints) ca parte a pipeline-ului CI/CD. SDK documentat în română + engleză + exemplu CI flow."
      bullets={[
        "Endpoint classify: POST /api/v1/systems → clasificare risc + Annex IV hints",
        "Endpoint deploy-gate: POST /api/v1/deploy → allow/block + missing evidence list",
        "SDK npm @compliroai/sdk pentru Node/TS",
        "Exemplu integrare GitHub Actions / GitLab CI",
        "Dashboard cu API key management + rotație + rate limits",
        "Webhook-uri pentru evenimente compliance (finding nou, deadline aproape)",
      ]}
    />
  )
}
