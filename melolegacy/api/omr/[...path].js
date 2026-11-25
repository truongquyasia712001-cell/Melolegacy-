// Vercel server-side proxy. Keep OMR_API_TOKEN out of browser bundles.
export const config = { api: { bodyParser: false } }

const MAX_PDF_BYTES = 4 * 1024 * 1024
const MAX_MULTIPART_OVERHEAD = 128 * 1024
const MAX_REQUEST_BYTES = MAX_PDF_BYTES + MAX_MULTIPART_OVERHEAD
const MAX_RESPONSE_BYTES = 16 * 1024 * 1024
const JOB_ID_PATTERN = /^[a-f0-9]{32}$/i

class PayloadTooLargeError extends Error {}

function resolveRoute(method, parts) {
  if (parts.length === 1 && parts[0] === 'jobs') {
    return { method: 'POST', path: '/v1/jobs' }
  }

  if (parts.length === 2 && parts[0] === 'jobs' && JOB_ID_PATTERN.test(parts[1])) {
    return { method: 'GET', path: '/v1/jobs/' + parts[1] }
  }

  if (parts.length === 3 && parts[0] === 'jobs' && JOB_ID_PATTERN.test(parts[1]) && parts[2] === 'musicxml') {
    return { method: 'GET', path: '/v1/jobs/' + parts[1] + '/musicxml' }
  }

  return null
}

async function readLimitedBody(req) {
  const chunks = []
  let total = 0

  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += bytes.length
    if (total > MAX_REQUEST_BYTES) throw new PayloadTooLargeError()
    chunks.push(bytes)
  }

  return Buffer.concat(chunks, total)
}

function sendError(res, status, message) {
  res.status(status).json({ error: message })
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')

  const rawPath = req.query?.path
  const parts = Array.isArray(rawPath) ? rawPath : [rawPath].filter(Boolean)
  const route = resolveRoute(req.method, parts)

  if (!route) {
    sendError(res, 404, 'Đường dẫn nhận dạng không hợp lệ.')
    return
  }

  if (req.method !== route.method) {
    res.setHeader('Allow', route.method)
    sendError(res, 405, 'Phương thức yêu cầu không được hỗ trợ.')
    return
  }

  const base = process.env.OMR_SERVICE_URL
  const token = process.env.OMR_API_TOKEN
  if (!base || !token) {
    sendError(res, 503, 'Dịch vụ nhận dạng PDF chưa được cấu hình trên máy chủ MeloLegacy.')
    return
  }

  let serviceBase
  try {
    serviceBase = new URL(base)
  } catch {
    sendError(res, 503, 'Địa chỉ dịch vụ nhận dạng trên máy chủ không hợp lệ.')
    return
  }

  if (!['http:', 'https:'].includes(serviceBase.protocol) || serviceBase.username || serviceBase.password || serviceBase.search || serviceBase.hash) {
    sendError(res, 503, 'Cấu hình địa chỉ dịch vụ nhận dạng không hợp lệ.')
    return
  }

  let body
  if (req.method === 'POST') {
    const contentType = String(req.headers['content-type'] || '')
    if (!/^multipart\/form-data;\s*boundary=/i.test(contentType)) {
      sendError(res, 415, 'Yêu cầu tải lên phải sử dụng multipart/form-data.')
      return
    }

    const declaredLength = req.headers['content-length']
    if (declaredLength !== undefined) {
      const parsedLength = Number(declaredLength)
      if (!Number.isSafeInteger(parsedLength) || parsedLength < 0) {
        sendError(res, 400, 'Kích thước yêu cầu không hợp lệ.')
        return
      }
      if (parsedLength > MAX_REQUEST_BYTES) {
        sendError(res, 413, 'PDF vượt quá giới hạn tải lên 4 MB.')
        return
      }
    }

    try {
      body = await readLimitedBody(req)
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        sendError(res, 413, 'PDF vượt quá giới hạn tải lên 4 MB.')
        return
      }
      throw error
    }

    if (!body.length) {
      sendError(res, 400, 'Không nhận được dữ liệu PDF.')
      return
    }
  }

  try {
    const target = new URL(route.path, serviceBase)
    const headers = {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json, application/vnd.recordare.musicxml+xml, application/octet-stream',
    }
    if (req.method === 'POST') headers['Content-Type'] = req.headers['content-type']

    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      signal: AbortSignal.timeout(30000),
    })

    const declaredResponseLength = Number(upstream.headers.get('content-length'))
    if (Number.isFinite(declaredResponseLength) && declaredResponseLength > MAX_RESPONSE_BYTES) {
      sendError(res, 502, 'Kết quả nhận dạng vượt quá giới hạn phản hồi.')
      return
    }

    const bytes = Buffer.from(await upstream.arrayBuffer())
    if (bytes.length > MAX_RESPONSE_BYTES) {
      sendError(res, 502, 'Kết quả nhận dạng vượt quá giới hạn phản hồi.')
      return
    }

    res.status(upstream.status)
    const contentType = upstream.headers.get('content-type')
    const disposition = upstream.headers.get('content-disposition')
    if (contentType) res.setHeader('Content-Type', contentType)
    if (disposition) res.setHeader('Content-Disposition', disposition)
    res.send(bytes)
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError'
    sendError(res, timedOut ? 504 : 502, timedOut
      ? 'Dịch vụ nhận dạng phản hồi quá thời gian cho phép.'
      : 'Không kết nối được dịch vụ nhận dạng PDF.')
  }
}
