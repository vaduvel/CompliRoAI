import { ShareTokenClient } from "./share-client"

export const dynamic = "force-dynamic"

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <ShareTokenClient token={token} />
}
