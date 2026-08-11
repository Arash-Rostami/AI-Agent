import {test, afterEach} from 'node:test'
import assert from 'node:assert/strict'
import {authedClient, okReply, fileForm, fixture, pace} from './helpers.js'

afterEach(pace);
import callGrokAPI from '../services/groq/index.js'
import callArvanCloudAPI, {
  ARVAN_CHATGPT_MODEL_ID,
  ARVAN_GEMINI_MODEL_ID,
  ARVAN_THINKING_MODEL_ID,
} from '../services/arvancloud/index.js'
import {askGemini} from '../services/gemini/index.js'

test.skip('Groq service (direct) returns text — skipped: protect Groq daily quota', {timeout: 60000}, async () => {
  const out = await callGrokAPI('Reply with the single word: PONG')
  assert.ok(typeof out === 'string' && out.trim().length > 0)
  console.log('  groq:', out.slice(0, 80))
})

test('ArvanCloud ChatGPT service (direct, GPT-OSS-120B)', {timeout: 60000}, async () => {
  const out = await callArvanCloudAPI('Reply with the single word: PONG', [], ARVAN_CHATGPT_MODEL_ID)
  assert.ok(typeof out === 'string' && out.trim().length > 0)
  console.log('  arvan-chatgpt:', out.slice(0, 80))
})

test('ArvanCloud Gemini-fallback service (direct)', {timeout: 60000}, async () => {
  const out = await callArvanCloudAPI('Reply with the single word: PONG', [], ARVAN_GEMINI_MODEL_ID)
  assert.ok(typeof out === 'string' && out.trim().length > 0)
  console.log('  arvan-gemini:', out.slice(0, 80))
})

test('ArvanCloud Thinking model service (direct)', {timeout: 60000}, async () => {
  const out = await callArvanCloudAPI('How many Rs are in Strawberry?', [], ARVAN_THINKING_MODEL_ID)
  assert.ok(typeof out === 'string' && out.trim().length > 0)
  console.log('  arvan-thinking:', out.slice(0, 80))
})

test('askGemini (direct, ArvanCloud Gemini text path) returns text', {timeout: 90000}, async () => {
  const {text, sources} = await askGemini('Reply with the single word: PONG', [], 'qa-direct-svc')
  assert.ok(typeof text === 'string' && text.trim().length > 0)
  assert.ok(Array.isArray(sources))
  console.log('  askGemini:', text.slice(0, 80))
})

test('GET /initial-prompt returns a greeting', {timeout: 90000}, async () => {
  const c = await authedClient('svc')
  const r = await c.get('/initial-prompt')
  assert.equal(r.status, 200)
  assert.ok(typeof r.data.response === 'string' && r.data.response.length > 0)
  assert.ok(r.data.sessionId, 'no sessionId')
  console.log('  greeting:', r.data.response.slice(0, 80))
})

test('POST /ask (Gemini primary) replies', {timeout: 90000}, async () => {
  const c = await authedClient('svc')
  const r = await c.post('/ask', {json: {message: 'What is 7 multiplied by 6? Reply with just the number.'}})
  assert.ok(okReply(r), r.raw)
  assert.match(r.data.reply, /42/)
  console.log('  ask:', r.data.reply.slice(0, 80))
})

test('POST /ask-arvan (ChatGPT, tool-calling) replies with a time', {timeout: 90000}, async () => {
  const c = await authedClient('svc')
  const r = await c.post('/ask-arvan', {json: {model: ARVAN_CHATGPT_MODEL_ID, message: 'What time is it in UTC right now? Use the time tool to answer precisely.'}})
  assert.ok(okReply(r), r.raw)
  assert.match(r.data.reply, /\b\d{1,2}:\d{2}\b/i)
  console.log('  arvan ask:', r.data.reply.slice(0, 120))
})

test.skip('POST /ask-groq replies — skipped: protect Groq daily quota', {timeout: 60000}, async () => {
  const c = await authedClient('svc')
  const r = await c.post('/ask-groq', {json: {message: 'Reply with the single word: PONG'}})
  assert.ok(okReply(r), r.raw)
  console.log('  groq ask:', r.data.reply.slice(0, 80))
})

test.skip('POST /api/ (simpleApi, stateless) replies — skipped: premium Gemini key required (free tier 429s)', {timeout: 60000}, async () => {
  const c = await authedClient('svc')
  const r = await c.post('/api/', {headers: {'Content-Type': 'text/plain'}, body: 'Reply with the single word: PONG'})
  assert.equal(r.status, 200)
  assert.ok(typeof r.data.response === 'string' && r.data.response.length > 0)
  console.log('  simpleApi:', r.data.response.slice(0, 80))
})

test('POST /ask with useThinkingMode (ArvanCloud thinking path)', {timeout: 120000}, async () => {
  const c = await authedClient('svc')
  const r = await c.post('/ask', {json: {message: 'How many Rs are in the word Strawberry? Think step by step.', useThinkingMode: 'true'}})
  assert.ok(okReply(r), r.raw)
  assert.ok(r.data.thinkingModeUsage && typeof r.data.thinkingModeUsage === 'object')
  console.log('  thinking reply:', r.data.reply.slice(0, 120))
})

test.skip('POST /ask with image attachment (Gemini vision pipeline) — skipped: premium Gemini key required (free tier 429s)', {timeout: 90000}, async () => {
  const c = await authedClient('svc')
  const form = fileForm('file', fixture('sample.png'), 'sample.png', 'image/png', {message: 'Describe this image in one short sentence. What color is it?'})
  const r = await c.call('POST', '/ask', {body: form})
  assert.ok(okReply(r), r.raw)
  assert.match(r.data.reply, /red/i, 'vision pipeline did not describe the red image — image may not have reached Gemini')
  console.log('  vision reply:', r.data.reply.slice(0, 160))
})

test.skip('POST /ask-smart (Gemini Smart) replies — skipped: premium Gemini key required (free tier 429s)', {timeout: 90000}, async () => {
  const c = await authedClient('svc')
  const r = await c.post('/ask-smart', {json: {message: 'Reply with the single word: PONG'}})
  assert.ok(okReply(r), r.raw)
  console.log('  smart ask:', r.data.reply.slice(0, 80))
})