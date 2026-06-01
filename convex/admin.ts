import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { internal } from './_generated/api'

// Convex env vars are available in all functions; declare process for the
// Convex tsconfig (no Node types).
declare const process: { env: Record<string, string | undefined> }

function assertAdmin(password: string) {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected || password !== expected) {
    throw new Error('Unauthorized — wrong admin password.')
  }
}

// Cheap gate check for the admin page (no side effects).
export const checkPassword = mutation({
  args: { password: v.string() },
  handler: (_ctx, args) => {
    const expected = process.env.ADMIN_PASSWORD
    return !!expected && args.password === expected
  },
})

// Every photo (including transforming/failed/placeholders) for the admin list.
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const photos = await ctx.db.query('photos').order('desc').collect()
    return Promise.all(
      photos.map(async (p) => ({
        id: p._id,
        name: p.name,
        company: p.company,
        status: p.status ?? 'ready',
        createdAt: p._creationTime,
        isUpload: !!p.storageId,
        imageUrl: p.storageId
          ? await ctx.storage.getUrl(p.storageId)
          : (p.imageUrl ?? null),
      })),
    )
  },
})

export const remove = mutation({
  args: { photoId: v.id('photos'), password: v.string() },
  handler: async (ctx, args) => {
    assertAdmin(args.password)
    const p = await ctx.db.get('photos', args.photoId)
    if (!p) return
    if (p.storageId) await ctx.storage.delete(p.storageId)
    await ctx.db.delete('photos', args.photoId)
  },
})

export const update = mutation({
  args: {
    photoId: v.id('photos'),
    name: v.string(),
    company: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    assertAdmin(args.password)
    await ctx.db.patch('photos', args.photoId, {
      name: args.name,
      company: args.company,
    })
  },
})

// Re-run the alien transform on an uploaded photo.
export const retransform = mutation({
  args: { photoId: v.id('photos'), password: v.string() },
  handler: async (ctx, args) => {
    assertAdmin(args.password)
    const p = await ctx.db.get('photos', args.photoId)
    if (!p || !p.storageId) throw new Error('No uploaded image to transform.')
    await ctx.db.patch('photos', args.photoId, { status: 'transforming' })
    await ctx.scheduler.runAfter(0, internal.aliens.transform, {
      photoId: args.photoId,
      storageId: p.storageId,
    })
  },
})
