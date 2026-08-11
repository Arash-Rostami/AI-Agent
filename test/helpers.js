import 'dotenv/config'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

export const BASE = process.env.TEST_BASE || 'http://localhost:3000'
const SIGNUP_SECRET = process.env.SIGNUP_SECRET
const PASS = process.env.TEST_PASS || 'Qa!Pass1_Test'

// Natural pause between tests so the suite doesn't pressure the LLM provider's rate limit.
export const pace = (ms = 3000) => new Promise(r => setTimeout(r, ms));

export function userFor(tag) {
  const prefix = process.env.TEST_USER_PREFIX || 'qa'
  return `${prefix}_${tag}`
}

export const REFERER = {
  restricted: 'https://team.persolco.com/',
  bms: 'https://export.bmsflow.org/',
  eteq: 'https://eteq.vercel.app/',
}

export const SKIP_EMAIL = !process.env.TEST_SEND_EMAIL
export const TEST_EMAIL_TO =
  (process.env.EMAIL_FROM || '').match(/<([^>]+)>/)?.[1] ||
  process.env.TEST_EMAIL_TO ||
  ''
export const emailSkipReason = 'set TEST_SEND_EMAIL=1 (and EMAIL_FROM in .env) to send a real email'

export class Client {
  constructor(headers = {}) {
    this.cookies = {}
    this.extra = { ...headers }
  }
  _cookieHeader() {
    return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ')
  }
  async send(method, path, { headers, json, body } = {}) {
    const h = { ...this.extra, ...(headers || {}) }
    const cookie = this._cookieHeader()
    if (cookie) h['Cookie'] = cookie
    let payload
    if (json !== undefined) {
      h['Content-Type'] = 'application/json'
      payload = JSON.stringify(json)
    } else if (body !== undefined) {
      payload = body
    }
    const res = await fetch(BASE + path, { method, headers: h, body: payload, redirect: 'manual' })
    for (const sc of res.headers.getSetCookie?.() || []) {
      const [pair] = sc.split(';')
      const i = pair.indexOf('=')
      if (i > -1) this.cookies[pair.slice(0, i).trim()] = pair.slice(i + 1)
    }
    return res
  }
  async call(method, path, opts = {}) {
    const res = await this.send(method, path, opts)
    const text = await res.text()
    let data
    try { data = text ? JSON.parse(text) : null } catch { data = text }
    return { status: res.status, headers: res.headers, data, raw: text }
  }
  get(p, o) { return this.call('GET', p, o) }
  post(p, o) { return this.call('POST', p, o) }
  del(p, o) { return this.call('DELETE', p, o) }
}

const _cache = new Map()
export async function authedClient(tag) {
  if (_cache.has(tag)) return _cache.get(tag)
  const username = userFor(tag)
  const c = new Client()
  let r = await c.post('/auth/login', { json: { username, password: PASS } })
  if (r.status !== 200) {
    r = await c.post('/auth/signup', { json: { username, password: PASS, secretKey: SIGNUP_SECRET } })
    if (r.status === 400) r = await c.post('/auth/login', { json: { username, password: PASS } })
  }
  assert.ok(r.status === 200 || r.status === 201, `auth failed for "${username}": ${r.raw}`)
  _cache.set(tag, c)
  return c
}

export function okReply(r) {
  return r.status === 200 && r.data && typeof r.data.reply === 'string' && r.data.reply.trim().length > 0
}

export async function poll(label, fn, timeoutMs = 10000, step = 300) {
  const end = Date.now() + timeoutMs
  let last
  while (Date.now() < end) {
    last = await fn()
    if (last) return last
    await new Promise(r => setTimeout(r, step))
  }
  return last
}

export function fileForm(field, buffer, filename, type, extra = {}) {
  const form = new FormData()
  form.append(field, new Blob([buffer], { type }), filename)
  for (const [k, v] of Object.entries(extra)) form.append(k, v)
  return form
}

export function fixture(name) {
  return fs.readFileSync(path.resolve('test/data', name))
}