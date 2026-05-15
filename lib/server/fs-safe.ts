import { promises as fs } from "node:fs"
import path from "node:path"

export async function writeFileSafe(filePath: string, data: string): Promise<void> {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, data, "utf-8")
  } catch {
    // silently skip on read-only filesystems (Vercel)
  }
}
