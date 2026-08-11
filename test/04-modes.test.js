import {test, afterEach} from 'node:test'
import assert from 'node:assert/strict'
import {Client, REFERER, okReply, pace} from './helpers.js'

afterEach(pace);

test('restricted mode blocks the weather tool (no temp reading)', {timeout: 90000}, async () => {
  const c = new Client({Referer: REFERER.restricted, 'X-User-Id': 'qa_restricted'})
  const r = await c.post('/ask', {json: {message: 'What is the current weather in Tokyo?'}})
  assert.equal(r.status, 200)
  assert.ok(typeof r.data.reply === 'string' && r.data.reply.length > 0)
  assert.doesNotMatch(r.data.reply, /-?\d+(\.\d+)?\s?°\s?c/i, 'weather tool should be blocked in restricted mode without web search')
  console.log('  restricted reply:', r.data.reply.slice(0, 200))
})

test('restricted mode allows web search when toggled', {timeout: 120000}, async () => {
  const c = new Client({Referer: REFERER.restricted, 'X-User-Id': 'qa_restricted'})
  const r = await c.post('/ask', {json: {message: 'Search the web for the latest AI news and summarize it.', useWebSearch: true}})
  assert.ok(okReply(r), r.raw)
  assert.ok(Array.isArray(r.data.sources) && r.data.sources.length > 0, 'web search should be allowed in restricted mode when toggled')
  console.log('  restricted web search sources:', r.data.sources.length)
})

test('BMS mode exposes searchBmsDatabase', {timeout: 120000}, async () => {
  const c = new Client({Referer: REFERER.bms, 'X-User-Id': 'qa_bms'})
  const r = await c.post('/ask', {json: {message: 'Query the BMS database for information about contracts and tell me what you find.'}})
  assert.equal(r.status, 200)
  assert.ok(typeof r.data.reply === 'string' && r.data.reply.length > 0)
  console.log('  bms reply:', r.data.reply.slice(0, 300))
})

test('ETEQ mode allows web search when toggled', {timeout: 120000}, async () => {
  const c = new Client({Referer: REFERER.eteq, 'X-User-Id': 'qa_eteq'})
  const r = await c.post('/ask', {json: {message: 'Search the web for the latest Node.js release and summarize it.', useWebSearch: true}})
  assert.ok(okReply(r), r.raw)
  assert.ok(Array.isArray(r.data.sources) && r.data.sources.length > 0)
  console.log('  eteq web search sources:', r.data.sources.length)
})

test('ETEQ mode is never persisted to Mongo', {timeout: 120000}, async () => {
  const id = 'qa_eteq_persist'
  const c = new Client({Referer: REFERER.eteq, 'X-User-Id': id})
  const ask = await c.post('/ask', {json: {message: 'Say hello in one short sentence.', useWebSearch: true}})
  assert.ok(okReply(ask), ask.raw)
  const hist = await c.get('/api/history')
  assert.equal(hist.status, 200)
  const matching = (hist.data.history || []).filter(h => h.sessionId === ask.data.sessionId)
  assert.equal(matching.length, 0, 'ETEQ session must not be persisted to Mongo')
  console.log('  eteq session not persisted (ok):', ask.data.sessionId.slice(0, 8))
})