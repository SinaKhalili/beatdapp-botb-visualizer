import { v } from 'convex/values'
import { internalMutation, query } from './_generated/server'

// Store one raw inbound webhook event verbatim.
export const store = internalMutation({
  args: {
    source: v.string(),
    method: v.string(),
    contentType: v.optional(v.string()),
    query: v.optional(v.string()),
    headers: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('webhookEvents', args)
  },
})

// Inspect the most recent captured events (run via `npx convex run`).
export const recent = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('webhookEvents').order('desc').take(50)
    return rows.map((r) => ({
      id: r._id,
      at: new Date(r._creationTime).toISOString(),
      source: r.source,
      method: r.method,
      contentType: r.contentType,
      query: r.query,
      body: r.body,
    }))
  },
})
