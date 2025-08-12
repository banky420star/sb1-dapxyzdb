import fetch from 'node-fetch'

const target = process.env.TEST_TARGET_URL || 'http://localhost:8000'
const runs = Number(process.env.PERF_RUNS || 50)

async function ping() {
  const start = Date.now()
  const res = await fetch(`${target}/api/health`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  await res.json()
  return Date.now() - start
}

async function main() {
  const latencies = []
  for (let i = 0; i < runs; i++) {
    try {
      const ms = await ping()
      latencies.push(ms)
    } catch (e) {
      console.error('Request failed:', e.message)
      process.exit(1)
    }
  }
  const sum = latencies.reduce((a, b) => a + b, 0)
  const avg = (sum / latencies.length).toFixed(2)
  const max = Math.max(...latencies)
  const min = Math.min(...latencies)
  console.log(`✅ Perf smoke passed: ${latencies.length} requests`)
  console.log(`Latency ms -> min: ${min}, avg: ${avg}, max: ${max}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})