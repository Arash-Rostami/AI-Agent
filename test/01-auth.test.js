import {test} from 'node:test'
import assert from 'node:assert/strict'
import {authedClient, userFor, fixture, fileForm, Client} from './helpers.js'

test('signup-or-login yields an authenticated client', {timeout: 30000}, async () => {
  const c = await authedClient('auth')
  assert.ok(c.cookies.jwt, 'jwt cookie not set after login')
  const admin = await c.get('/auth/admin')
  assert.equal(admin.status, 200)
  assert.equal(admin.data.username, userFor('auth'))
})

test('protected endpoint redirects without jwt (302, not JSON 401)', {timeout: 15000}, async () => {
  const c = new Client()
  const r = await c.get('/initial-prompt')
  assert.equal(r.status, 302)
})

test('change-password rejects wrong current password (non-mutating)', {timeout: 20000}, async () => {
  const c = await authedClient('auth')
  const r = await c.post('/auth/change-password', {json: {currentPassword: 'definitely-wrong', newPassword: 'x'}})
  assert.equal(r.status, 401)
})

test('avatar upload then remove', {timeout: 20000}, async () => {
  const c = await authedClient('auth')
  const form = fileForm('avatar', fixture('sample.png'), 'sample.png', 'image/png')
  const up = await c.call('POST', '/auth/upload-avatar', {body: form})
  assert.equal(up.status, 200)
  assert.match(up.data.avatar, /^\/assets\/img\/avatars\//)
  const rm = await c.post('/auth/remove-avatar')
  assert.equal(rm.status, 200)
  assert.equal(rm.data.avatar, null)
})