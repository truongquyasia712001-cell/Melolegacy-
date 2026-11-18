// Vercel server-side proxy. Keep OMR_API_TOKEN out of browser bundles.
export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  const base = process.env.OMR_SERVICE_URL
  const token = process.env.OMR_API_TOKEN
  if (!base || !token) {
    res.status(503).json({ error: 'Dịch vụ nhận dạng PDF chưa được cấu hình trên máy chủ MeloLegacy.' })
    return
  }

  const rawPath = req.query?.path
  const parts = Array.isArray(rawPath) ? rawPath : [rawPath].filter(Boolean)
  if (!parts.length || parts.some(part => part === '.' || part === '..' || String(part).includes('/'))) {
    res.status(400).json({ error: 'Đường dẫn nhận dạng không hợp lệ.' })
    return
  }

  const target = new URL('/v1/' + parts.map(part => encodeURIComponent(String(part))).join('/'), base.endsWith('/') ? base : base + '/')
  const queryIndex = req.url?.indexOf('?') ?? -1
  if (queryIndex >= 0) {
    const query = new URLSearchParams(req.url.slice(queryIndex + 1))
    query.forEach((value, key) => target.searchParams.set(key, value))
  }

  try {
    let body
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = []
      for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      body = Buffer.concat(chunks)
    }
    const headers = { Authorization: 'Bearer ' + token }
    if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type']
    const upstream = await fetch(target, { method: req.method, headers, body })
    res.status(upstream.status)
    const contentType = upstream.headers.get('content-type')
    const disposition = upstream.headers.get('content-disposition')
    if (contentType) res.setHeader('Content-Type', contentType)
    if (disposition) res.setHeader('Content-Disposition', disposition)
    const bytes = Buffer.from(await upstream.arrayBuffer())
    res.send(bytes)
  } catch (error) {
    res.status(502).json({ error: 'Không kết nối được dịch vụ nhận dạng PDF.', detail: error instanceof Error ? error.message : 'Unknown proxy error' })
  }
}
