import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import test from 'node:test'
import handler from '../../api/omr/[...path].js'

const MAX_REQUEST_BYTES = 4 * 1024 * 1024 + 128 * 1024
const JOB_ID = '0123456789abcdef0123456789abcdef'

function makeRequest({ method = 'GET', path, body = Buffer.alloc(0), headers = {} }) {
  const req = Readable.from(body.length ? [body] : [])
  req.method = method
  req.url = '/api/omr/' + path.join('/')
  req.query = { path }
  req.headers = headers
  return req
}

function makeResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    status(code) { this.statusCode = code; return this },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value },
    json(value) { this.body = value; return this },
    send(value) { this.body = value; return this },
  }
}

function saveEnvironment() {
  return {
    url: process.env.OMR_SERVICE_URL,
    token: process.env.OMR_API_TOKEN,
    fetch: globalThis.fetch,
  }
}

function restoreEnvironment(previous) {
  if (previous.url === undefined) delete process.env.OMR_SERVICE_URL
  else process.env.OMR_SERVICE_URL = previous.url
  if (previous.token === undefined) delete process.env.OMR_API_TOKEN
  else process.env.OMR_API_TOKEN = previous.token
  globalThis.fetch = previous.fetch
}

function configureService() {
  process.env.OMR_SERVICE_URL = 'https://omr.internal'
  process.env.OMR_API_TOKEN = 'test-only-token'
}

test('rejects paths outside the three supported OMR operations', async () => {
  const previous = saveEnvironment()
  try {
    const response = makeResponse()
    await handler(makeRequest({ path: ['admin', 'config'] }), response)
    assert.equal(response.statusCode, 404)
    assert.equal(response.headers['cache-control'], 'no-store')
  } finally {
    restoreEnvironment(previous)
  }
})

test('rejects methods that do not match the requested OMR operation', async () => {
  const previous = saveEnvironment()
  try {
    const response = makeResponse()
    await handler(makeRequest({ method: 'POST', path: ['jobs', JOB_ID] }), response)
    assert.equal(response.statusCode, 405)
    assert.equal(response.headers.allow, 'GET')
  } finally {
    restoreEnvironment(previous)
  }
})

test('rejects non-multipart job uploads before contacting the OMR service', async () => {
  const previous = saveEnvironment()
  let fetchCalled = false
  try {
    configureService()
    globalThis.fetch = async () => { fetchCalled = true; return new Response('{}') }
    const response = makeResponse()
    await handler(makeRequest({ method: 'POST', path: ['jobs'], headers: { 'content-type': 'application/json' } }), response)
    assert.equal(response.statusCode, 415)
    assert.equal(fetchCalled, false)
  } finally {
    restoreEnvironment(previous)
  }
})

test('rejects an oversized declared upload before reading or forwarding it', async () => {
  const previous = saveEnvironment()
  let fetchCalled = false
  try {
    configureService()
    globalThis.fetch = async () => { fetchCalled = true; return new Response('{}') }
    const response = makeResponse()
    await handler(makeRequest({
      method: 'POST',
      path: ['jobs'],
      headers: {
        'content-type': 'multipart/form-data; boundary=test',
        'content-length': String(MAX_REQUEST_BYTES + 1),
      },
    }), response)
    assert.equal(response.statusCode, 413)
    assert.equal(fetchCalled, false)
  } finally {
    restoreEnvironment(previous)
  }
})

test('enforces the upload limit while streaming when Content-Length is absent', async () => {
  const previous = saveEnvironment()
  let fetchCalled = false
  try {
    configureService()
    globalThis.fetch = async () => { fetchCalled = true; return new Response('{}') }
    const response = makeResponse()
    const body = Buffer.alloc(MAX_REQUEST_BYTES + 1)
    await handler(makeRequest({
      method: 'POST',
      path: ['jobs'],
      body,
      headers: { 'content-type': 'multipart/form-data; boundary=test' },
    }), response)
    assert.equal(response.statusCode, 413)
    assert.equal(fetchCalled, false)
  } finally {
    restoreEnvironment(previous)
  }
})

test('forwards only the allowed job route with the server-side token', async () => {
  const previous = saveEnvironment()
  const requestBody = Buffer.from('--test-boundary\r\nsmall-fixture\r\n')
  try {
    configureService()
    globalThis.fetch = async (url, options) => {
      assert.equal(String(url), 'https://omr.internal/v1/jobs')
      assert.equal(options.method, 'POST')
      assert.equal(options.headers.Authorization, 'Bearer test-only-token')
      assert.equal(options.headers['Content-Type'], 'multipart/form-data; boundary=test')
      assert.deepEqual(options.body, requestBody)
      return new Response('{"id":"' + JOB_ID + '"}', {
        status: 202,
        headers: { 'content-type': 'application/json' },
      })
    }

    const response = makeResponse()
    await handler(makeRequest({
      method: 'POST',
      path: ['jobs'],
      body: requestBody,
      headers: { 'content-type': 'multipart/form-data; boundary=test', 'content-length': String(requestBody.length) },
    }), response)

    assert.equal(response.statusCode, 202)
    assert.equal(response.headers['content-type'], 'application/json')
    assert.match(response.body.toString(), new RegExp(JOB_ID))
  } finally {
    restoreEnvironment(previous)
  }
})

test('forwards a validated MusicXML result path without accepting a client token', async () => {
  const previous = saveEnvironment()
  try {
    configureService()
    globalThis.fetch = async (url, options) => {
      assert.equal(String(url), 'https://omr.internal/v1/jobs/' + JOB_ID + '/musicxml')
      assert.equal(options.method, 'GET')
      assert.equal(options.headers.Authorization, 'Bearer test-only-token')
      return new Response('<score-partwise/>', {
        status: 200,
        headers: { 'content-type': 'application/vnd.recordare.musicxml+xml' },
      })
    }

    const response = makeResponse()
    await handler(makeRequest({ path: ['jobs', JOB_ID, 'musicxml'] }), response)
    assert.equal(response.statusCode, 200)
    assert.equal(response.body.toString(), '<score-partwise/>')
  } finally {
    restoreEnvironment(previous)
  }
})
