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
    imageUrl: v.string(),
    // Stable random number used for deterministic placement/coloring in 3D.
    seed: v.number(),
  }),
})
