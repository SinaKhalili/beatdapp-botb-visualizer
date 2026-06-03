import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'

const http = httpRouter()

// Raw catch-all webhook receiver. Logs and stores whatever the vendor sends so
// we can see their exact payload shape, then map fields later. No field
// assumptions yet — just capture.
const snappicWebhook = httpAction(async (ctx, req) => {
  const url = new URL(req.url)
  const body = await req.text().catch(() => '')

  const headers: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    headers[key] = value
  })

  console.log(
    `[webhook snappic] ${req.method} ${url.search} ct=${req.headers.get(
      'content-type',
    )} len=${body.length}`,
  )
  console.log(`[webhook snappic body] ${body.slice(0, 4000)}`)

  await ctx.runMutation(internal.webhooks.store, {
    source: 'snappic',
    method: req.method,
    contentType: req.headers.get('content-type') ?? undefined,
    query: url.search || undefined,
    headers: JSON.stringify(headers),
    body: body.slice(0, 900_000), // cap under Convex's 1MB string limit
  })

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
})

// Accept POST (real events) and GET (verification pings) at the same path.
http.route({ path: '/hooks/snappic', method: 'POST', handler: snappicWebhook })
http.route({ path: '/hooks/snappic', method: 'GET', handler: snappicWebhook })

export default http
