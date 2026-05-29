import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { internal } from './_generated/api'

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

// Single photo by id, with its resolved image URL + transform status. The
// upload page subscribes to this to drive the transmission effect and reveal.
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

// Step 1 of an upload: hand the client a short-lived URL to POST the file to.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  },
})

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Step 2 of an upload: create the planet from the stored file + label.
export const addUploadedPhoto = mutation({
  args: {
    name: v.string(),
    company: v.string(),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    // Enforce limits on the already-uploaded file; delete it if it's no good.
    const meta = await ctx.db.system.get('_storage', args.storageId)
    if (!meta) throw new Error('Upload not found — please try again.')
    if (!meta.contentType || !ALLOWED_TYPES.includes(meta.contentType)) {
      await ctx.storage.delete(args.storageId)
      throw new Error('Please upload a JPG, PNG, or WebP image.')
    }
    if (meta.size > MAX_UPLOAD_BYTES) {
      await ctx.storage.delete(args.storageId)
      throw new Error('Image must be under 10 MB.')
    }

    const seed = Math.floor(Math.random() * 1_000_000)
    const photoId = await ctx.db.insert('photos', {
      name: args.name,
      company: args.company,
      storageId: args.storageId,
      seed,
      status: 'transforming',
    })
    // Transform into a psychedelic alien in the background; the planet shows the
    // original immediately and swaps to the alien version when it's ready.
    await ctx.scheduler.runAfter(0, internal.aliens.transform, {
      photoId,
      storageId: args.storageId,
    })
    return photoId
  },
})

// Single entry point for adding a photo. Used by the seed script now and by the
// Google Drive sync later. `seed` defaults to a random number if not supplied.
export const addPhoto = mutation({
  args: {
    name: v.string(),
    company: v.string(),
    imageUrl: v.string(),
    seed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const seed = args.seed ?? Math.floor(Math.random() * 1_000_000)
    return await ctx.db.insert('photos', {
      name: args.name,
      company: args.company,
      imageUrl: args.imageUrl,
      seed,
    })
  },
})

// Mock attendees, used to make the screen look alive before real photos arrive.
const PLACEHOLDERS: Array<{ name: string; company: string }> = [
  { name: 'Ada Lovelace', company: 'Analytical Engines' },
  { name: 'Grace Hopper', company: 'COBOL Collective' },
  { name: 'Alan Turing', company: 'Bletchley Labs' },
  { name: 'Katherine Johnson', company: 'Orbital Dynamics' },
  { name: 'Nikola Tesla', company: 'Wardenclyffe' },
  { name: 'Hedy Lamarr', company: 'Spread Spectrum Co.' },
  { name: 'Claude Shannon', company: 'Information Theory Inc.' },
  { name: 'Margaret Hamilton', company: 'Apollo Software' },
  { name: 'Tim Berners-Lee', company: 'World Wide Web' },
  { name: 'Radia Perlman', company: 'Spanning Tree' },
  { name: 'Vint Cerf', company: 'TCP/IP Foundation' },
  { name: 'Barbara Liskov', company: 'Abstraction Labs' },
  { name: 'Dennis Ritchie', company: 'Bell Systems' },
  { name: 'Sophie Wilson', company: 'Acorn Risc' },
  { name: 'John Carmack', company: 'id Software' },
  { name: 'Carol Shaw', company: 'Activision' },
  { name: 'Linus Torvalds', company: 'Kernel Works' },
  { name: 'Joan Clarke', company: 'Hut 8' },
]

// Inserts the placeholder attendees if the table is empty. Safe to call on load.
export const seedPhotos = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('photos').take(1)
    if (existing.length > 0) return { inserted: 0 }

    let inserted = 0
    for (const person of PLACEHOLDERS) {
      const seed = Math.floor(Math.random() * 1_000_000)
      await ctx.db.insert('photos', {
        name: person.name,
        company: person.company,
        // Seeded placeholder images — distinct per attendee, stable per seed.
        imageUrl: `https://picsum.photos/seed/${seed}/512/512`,
        seed,
      })
      inserted++
    }
    return { inserted }
  },
})
