import { Client } from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
  }

  const client = new Client({ connectionString: databaseUrl })
  await client.connect()

  const migrationsDir = path.resolve(__dirname, '..', 'migrations')
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  console.log(`Found ${files.length} migration(s)`) 

  for (const file of files) {
    const filePath = path.join(migrationsDir, file)
    const sql = fs.readFileSync(filePath, 'utf-8')
    console.log(`Running migration: ${file}`)
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('COMMIT')
      console.log(`✔ Completed: ${file}`)
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`✖ Failed: ${file}`)
      console.error(err)
      await client.end()
      process.exit(1)
    }
  }

  await client.end()
  console.log('All migrations completed successfully')
}

runMigrations().catch((err) => {
  console.error(err)
  process.exit(1)
})