import { v } from 'convex/values'
import { query } from './_generated/server'

// The event is over (June 2026): all photos were migrated into Convex file
// storage and every upload/add path was removed. This module is read-only.

// Returns every photo in creation order. The client subscribes to this, so
// inserting a row makes a new planet animate into the universe automatically.
export const listPhotos = query({
  args: {},
  handler: async (ctx) => {
    const photos = await ctx.db.query('photos').order('asc').collect()
    const resolved = await Promise.all(
      photos.map(async (p) => {
        // Uploaded photos resolve their URL from storage; seeded ones have one.
        const imageUrl = p.storageId
          ? await ctx.storage.getUrl(p.storageId)
          : p.imageUrl
        if (!imageUrl) return null
        return {
          id: p._id,
          name: p.name,
          company: p.company,
          imageUrl,
          seed: p.seed,
          createdAt: p._creationTime,
        }
      }),
    )
    // Drop any whose file went missing.
    return resolved.filter((p): p is NonNullable<typeof p> => p !== null)
  },
})

// Single photo by id, with its resolved image URL + transform status.
export const getPhoto = query({
  args: { photoId: v.id('photos') },
  handler: async (ctx, args) => {
    const p = await ctx.db.get('photos', args.photoId)
    if (!p) return null
    const imageUrl = p.storageId
      ? await ctx.storage.getUrl(p.storageId)
      : p.imageUrl
    return {
      id: p._id,
      name: p.name,
      company: p.company,
      imageUrl,
      status: p.status ?? 'ready',
    }
  },
})

