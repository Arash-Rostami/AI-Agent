import {test, afterEach} from 'node:test'
import assert from 'node:assert/strict'
import {
  authedClient,
  okReply,
  poll,
  SKIP_EMAIL,
  TEST_EMAIL_TO,
  emailSkipReason,
  pace,
} from './helpers.js'

afterEach(pace);

const emailTest = SKIP_EMAIL || !TEST_EMAIL_TO ? test.skip : test

test('new-chat mints a session and sets the session_id cookie', {timeout: 20000}, async () => {
  const c = await authedClient('hist')
  const r = await c.post('/new-chat')
  assert.equal(r.status, 200)
  assert.ok(r.data.sessionId)
  assert.equal(c.cookies.session_id, r.data.sessionId, 'session_id cookie not set on new-chat')
})

test('in-memory history carries across turns in the same session', {timeout: 150000}, async () => {
  const c = await authedClient('hist')
  await c.post('/new-chat')
  const r1 = await c.post('/ask', {json: {message: 'Please remember the secret codeword MANGO-742. Just acknowledge briefly.'}})
  assert.ok(okReply(r1), r1.raw)
  const r2 = await c.post('/ask', {json: {message: 'What was the secret codeword I just told you?'}})
  assert.ok(okReply(r2), r2.raw)
  assert.match(r2.data.reply, /mango/i, 'in-memory history did not carry the codeword to the next turn')
  console.log('  recall reply:', r2.data.reply.slice(0, 160))
})

test('history is persisted, listed, and its details retrievable', {timeout: 120000}, async () => {
  const c = await authedClient('hist')
  const nc = await c.post('/new-chat')
  const sid = nc.data.sessionId
  const ask = await c.post('/ask', {json: {message: 'My favorite color is teal. Remember it.'}})
  assert.ok(okReply(ask), ask.raw)
  const found = await poll('history list contains session', async () => {
    const h = await c.get('/api/history')
    return (h.data.history || []).find(x => x.sessionId === sid)
  }, 15000)
  assert.ok(found, 'session not found in persisted history list')
  assert.ok(found.preview.length > 0, 'empty preview')
  const det = await c.get(`/api/history/${sid}`)
  assert.equal(det.status, 200)
  assert.ok(det.data.messages?.length >= 2, 'details missing messages')
  console.log('  preview:', found.preview)
})

test('restore mints a NEW session id and restores messages', {timeout: 120000}, async () => {
  const c = await authedClient('hist')
  const nc = await c.post('/new-chat')
  const oldSid = nc.data.sessionId
  const ask = await c.post('/ask', {json: {message: 'The capital of France is Paris.'}})
  assert.ok(okReply(ask), ask.raw)
  await poll('persisted before restore', async () => (await c.get(`/api/history/${oldSid}`)).status === 200, 15000)
  const restore = await c.post(`/api/history/${oldSid}/restore`)
  assert.equal(restore.status, 200)
  assert.notEqual(restore.data.sessionId, oldSid, 'restore must mint a new session id, not resume the old one')
  assert.ok(restore.data.messages?.length >= 2, 'no restored messages')
  assert.equal(c.cookies.session_id, restore.data.sessionId, 'session_id cookie not updated on restore')
  console.log('  old', oldSid.slice(0, 8), '-> new', restore.data.sessionId.slice(0, 8))
})

test('clear-chat clears in-memory history but the Mongo record survives', {timeout: 60000}, async () => {
  const c = await authedClient('hist')
  const nc = await c.post('/new-chat')
  const sid = nc.data.sessionId
  const ask = await c.post('/ask', {json: {message: 'A session to clear.'}})
  assert.ok(okReply(ask), ask.raw)
  await poll('persisted before clear', async () => (await c.get(`/api/history/${sid}`)).status === 200, 15000)
  const clear = await c.post('/clear-chat')
  assert.equal(clear.status, 200)
  assert.equal(clear.data.success, true)
  const det = await c.get(`/api/history/${sid}`)
  assert.equal(det.status, 200, 'Mongo record should survive clear-chat')
})

test('delete removes the Mongo record', {timeout: 60000}, async () => {
  const c = await authedClient('hist')
  const nc = await c.post('/new-chat')
  const sid = nc.data.sessionId
  const ask = await c.post('/ask', {json: {message: 'A session to delete.'}})
  assert.ok(okReply(ask), ask.raw)
  await poll('persisted before delete', async () => (await c.get(`/api/history/${sid}`)).status === 200, 15000)
  const del = await c.del(`/api/history/${sid}`)
  assert.equal(del.status, 200)
  assert.equal(del.data.success, true)
  const after = await c.get(`/api/history/${sid}`)
  assert.equal(after.status, 404)
})

emailTest('email interaction sends chat history (real SMTP)', {timeout: 120000}, async () => {
  const c = await authedClient('hist')
  const nc = await c.post('/new-chat')
  const sid = nc.data.sessionId
  const ask = await c.post('/ask', {json: {message: 'A short conversation to email.'}})
  assert.ok(okReply(ask), ask.raw)
  await poll('persisted before email', async () => (await c.get(`/api/history/${sid}`)).status === 200, 15000)
  const r = await c.post(`/api/history/${sid}/email`, {json: {email: TEST_EMAIL_TO}})
  assert.equal(r.status, 200)
  assert.equal(r.data.success, true)
  console.log('  emailed history for', sid.slice(0, 8))
})