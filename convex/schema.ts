import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

// The schema provides more precise TypeScript types.
export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),

  // Each attendee photo becomes a planet in the BOTB Universe.
  photos: defineTable({
    name: v.string(),
    company: v.string(),
    // Seeded placeholders use a direct URL; uploads use Convex file storage.
    imageUrl: v.optional(v.string()),
    storageId: v.optional(v.id('_storage')),
    // Stable random number used for deterministic placement/coloring in 3D.
    seed: v.number(),
    // Alien-transform lifecycle (uploads only): transforming → ready | failed.
    status: v.optional(
      v.union(
        v.literal('transforming'),
        v.literal('ready'),
        v.literal('failed'),
      ),
    ),
    // Snappic photobooth import: the AI session id (dedup) + the linked still
    // session id (to attach the survey "world" answer, which can arrive later).
    externalId: v.optional(v.string()),
    originalSessionId: v.optional(v.string()),
  })
    .index('by_externalId', ['externalId'])
    .index('by_originalSession', ['originalSessionId']),

  // Survey answers from the booth, keyed by their session id, so a photo that
  // arrives before/after its survey can still be matched to its "world".
  boothSurveys: defineTable({
    sessionId: v.string(),
    world: v.string(),
  }).index('by_session', ['sessionId']),

  // Raw inbound webhook payloads (e.g. from the Snappic photobooth). Captured
  // as-is so we can inspect the vendor's shape before mapping fields.
  webhookEvents: defineTable({
    source: v.string(),
    method: v.string(),
    contentType: v.optional(v.string()),
    query: v.optional(v.string()),
    headers: v.string(), // JSON string
    body: v.string(), // raw request body (capped)
  }),
})
