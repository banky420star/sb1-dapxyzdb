import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  const modelsDir = path.resolve(__dirname, '..', '..', '..', 'models')
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true })
  }
  const artifactPath = path.join(modelsDir, 'smoke-model.h5')
  fs.writeFileSync(artifactPath, 'smoke-test-artifact')
  console.log(`✅ Created model artifact: ${artifactPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})