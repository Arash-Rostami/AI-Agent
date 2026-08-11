import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'

const TEST_FILES = fs.readdirSync(path.resolve('test'))
  .filter(f => f.endsWith('.test.js'))
  .map(f => path.join('test', f))

const PORT = process.env.PORT || '3000'
const BASE = process.env.TEST_BASE || `http://localhost:${PORT}`
const READY_PATH = '/login.html'

function ping(p) {
  return new Promise(resolve => {
    const req = http.get(BASE + p, r => { r.resume(); resolve(r.statusCode) })
    req.on('error', () => resolve(0))
    req.setTimeout(3000, () => { req.destroy(); resolve(0) })
  })
}

async function waitReady(dead, ms = 60000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (dead()) return false
    if (await ping(READY_PATH) === 200) return true
    await new Promise(r => setTimeout(r, 500))
  }
  return false
}

function killTree(proc) {
  if (!proc || proc.exitCode !== null) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    try { proc.kill('SIGTERM') } catch {}
  }
}

async function main() {
  if (process.argv.includes('--email')) process.env.TEST_SEND_EMAIL = '1'
  if (!fs.existsSync('.env')) {
    console.error('\n[run] .env not found — tests require a configured environment.\n')
    process.exit(1)
  }

  const reuse = (await ping(READY_PATH)) === 200
  let proc
  let dead = () => false

  if (reuse) {
    console.log(`[run] server already reachable at ${BASE} — reusing it.`)
  } else {
    console.log('[run] booting server (node app.js) ...')
    const log = fs.createWriteStream('test/.server.log')
    proc = spawn(process.execPath, ['app.js'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    })
    proc.stdout.pipe(log)
    proc.stderr.pipe(log)
    let exited = false
    dead = () => exited
    proc.on('exit', code => {
      exited = true
      if (!reuse) console.error(`[run] server exited early (code ${code}) — see test/.server.log`)
    })
  }

  let exitCode = 1
  try {
    if (proc && !(await waitReady(dead, 60000))) {
      console.error('\n[run] server did not become ready in time — see test/.server.log\n')
      killTree(proc)
      process.exit(1)
    }
    if (!reuse) console.log(`[run] server ready at ${BASE}`)
    console.log('[run] running suite: node --test <test files>\n')
    const r = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...TEST_FILES], { stdio: 'inherit' })
    exitCode = r.status ?? 1
  } finally {
    if (proc) {
      console.log('\n[run] stopping server ...')
      killTree(proc)
    }
  }
  process.exit(exitCode)
}

if (!process.env.NODE_TEST_CONTEXT) {
  main().catch(e => { console.error('[run] fatal:', e); process.exit(1) })
}