import {test, afterEach} from 'node:test'
import assert from 'node:assert/strict'
import {authedClient, okReply, SKIP_EMAIL, TEST_EMAIL_TO, emailSkipReason, pace} from './helpers.js'

afterEach(pace);

const emailTest = SKIP_EMAIL || !TEST_EMAIL_TO ? test.skip : test

test('getCurrentWeather tool', {timeout: 90000}, async () => {
  const c = await authedClient('tools')
  const r = await c.post('/ask', {json: {message: 'What is the current weather in Tokyo? Use the weather tool to answer.'}})
  assert.ok(okReply(r), r.raw)
  assert.match(r.data.reply, /tokyo|°c|°f|celsius|fahrenheit|temperature/i)
  console.log('  weather:', r.data.reply.slice(0, 160))
})

test('getWeatherForecast tool', {timeout: 90000}, async () => {
  const c = await authedClient('tools')
  const r = await c.post('/ask', {json: {message: 'Give me the weather forecast for London over the coming days. Use the forecast tool.'}})
  assert.ok(okReply(r), r.raw)
  assert.match(r.data.reply, /forecast|°c|°f|day/i)
  console.log('  forecast:', r.data.reply.slice(0, 160))
})

test('getAirQuality tool', {timeout: 90000}, async () => {
  const c = await authedClient('tools')
  const r = await c.post('/ask', {json: {message: 'What is the air quality index (AQI) in Tehran right now? Use the air quality tool.'}})
  assert.ok(okReply(r), r.raw)
  assert.match(r.data.reply, /aqi|air quality|pollut|good|fair|moderate|poor/i)
  console.log('  aqi:', r.data.reply.slice(0, 160))
})

test('getCurrentTime tool', {timeout: 90000}, async () => {
  const c = await authedClient('tools')
  const r = await c.post('/ask', {json: {message: 'What time and date is it in Asia/Tehran right now? Use the time tool.'}})
  assert.ok(okReply(r), r.raw)
  assert.match(r.data.reply, /\b\d{1,2}:\d{2}\b/i)
  console.log('  time:', r.data.reply.slice(0, 160))
})

test('getWebSearch tool returns sources', {timeout: 120000}, async () => {
  const c = await authedClient('tools')
  const r = await c.post('/ask', {json: {message: 'Search the web for the latest SpaceX launch and briefly tell me about it.', useWebSearch: true}})
  assert.ok(okReply(r), r.raw)
  assert.ok(Array.isArray(r.data.sources) && r.data.sources.length > 0, 'no sources returned by getWebSearch')
  console.log('  web search sources:', r.data.sources.length)
})

test('crawlWebPage tool', {timeout: 120000}, async () => {
  const c = await authedClient('tools')
  const r = await c.post('/ask', {json: {message: 'Crawl the web page at https://example.com and tell me what it says. Use the crawl tool.'}})
  assert.ok(okReply(r), r.raw)
  assert.match(r.data.reply, /example domain/i)
  console.log('  crawler:', r.data.reply.slice(0, 160))
})

test('getBusinessInfo (persolBS document) tool', {timeout: 90000}, async () => {
  const c = await authedClient('tools')
  const r = await c.post('/ask', {json: {message: 'Use the business information tool to read the business document, then summarize it in one sentence.'}})
  assert.ok(okReply(r), r.raw)
  console.log('  business info:', r.data.reply.slice(0, 200))
})

emailTest('sendEmail tool (real SMTP)', {timeout: 120000}, async () => {
  const c = await authedClient('tools')
  const r = await c.post('/ask', {json: {message: `Send an email to ${TEST_EMAIL_TO} with the subject "QA Suite Test" and the body "This is an automated test from the QA suite."`}})
  assert.ok(okReply(r), r.raw)
  assert.match(r.data.reply, /sent|email|delivered|message id/i)
  console.log('  email:', r.data.reply.slice(0, 200))
})