import handler from '@tanstack/react-start/server-entry'

// Custom Worker entry: serve the archived event photos from R2 at /photos/*
// (free egress, unlike Convex file bandwidth), and hand everything else to the
// TanStack Start app.
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/photos/')) {
      const key = decodeURIComponent(url.pathname.slice('/photos/'.length))
      const object = await env.BOTB_PHOTOS.get(key)
      if (!object) return new Response('Not found', { status: 404 })
      const headers = new Headers()
      object.writeHttpMetadata(headers)
      headers.set('etag', object.httpEtag)
      // The archive is frozen — cache forever, including on Cloudflare's edge.
      headers.set('cache-control', 'public, max-age=31536000, immutable')
      // Planet textures load cross-origin into WebGL.
      headers.set('access-control-allow-origin', '*')
      return new Response(object.body, { headers })
    }
    // The stock server entry forwards all worker args at runtime even though
    // its type only declares (request, opts?) — keep passing env/ctx through
    // exactly as the pre-custom-entry deployment did.
    const fetchApp = handler.fetch as unknown as (
      request: Request,
      env: Env,
      ctx: ExecutionContext,
    ) => Promise<Response>
    return fetchApp(request, env, ctx)
  },
}
