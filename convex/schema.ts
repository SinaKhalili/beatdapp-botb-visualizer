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
  }),
})
