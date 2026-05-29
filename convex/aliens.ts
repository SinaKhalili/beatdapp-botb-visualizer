import { v } from 'convex/values'
import { internalAction, internalMutation } from './_generated/server'
import { internal } from './_generated/api'

// Convex actions expose env vars via process.env at runtime; declare its shape
// since the Convex tsconfig doesn't include Node types.
declare const process: { env: Record<string, string | undefined> }

// Turns an uploaded photo into a psychedelic-alien version with OpenAI's image
// edit endpoint, then swaps the planet's texture in place. Runs in the
// background (scheduled from addUploadedPhoto) so the planet shows instantly and
// transforms a moment later. The photo's `status` drives the upload page's
// transmission effect: transforming → ready | failed.
//
// Model: gpt-image-2 at quality "medium" (good quality/cost balance; bump to
// "high" for max fidelity at ~4x the cost).

const PROMPT =
  'Give the subject of this photo a SLIGHT psychedelic alien makeover while ' +
  'keeping them clearly recognizable: keep the same face, pose, and ' +
  'composition, but tint the skin with otherworldly cosmic colors, add a hint ' +
  'of subtle alien features and a trippy neon glow with swirling galaxy tones ' +
  'in the background. Tasteful and surreal, not a full replacement.'

export const transform = internalAction({
  args: { photoId: v.id('photos'), storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    const fail = (msg: string, detail?: unknown): Promise<null> => {
      console.error('alien transform failed:', msg, detail ?? '')
      return ctx.runMutation(internal.aliens.finishTransform, {
        photoId: args.photoId,
        status: 'failed' as const,
      })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return fail('OPENAI_API_KEY not set')

    const blob = await ctx.storage.get(args.storageId)
    if (!blob) return fail('source image missing', args.storageId)

    const ext =
      blob.type === 'image/jpeg'
        ? 'jpg'
        : blob.type === 'image/webp'
          ? 'webp'
          : 'png'

    const form = new FormData()
    form.append('model', 'gpt-image-2') // latest model
    form.append('image', blob, `input.${ext}`)
    form.append('prompt', PROMPT)
    form.append('size', '1024x1024')
    form.append('quality', 'medium') // step up from low; bump to 'high' for max
    form.append('n', '1')

    let res: Response
    try {
      res = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      })
    } catch (e) {
      return fail('network error', e)
    }

    if (!res.ok) return fail(`OpenAI ${res.status}`, await res.text())

    const json = (await res.json()) as { data?: Array<{ b64_json?: string }> }
    const b64 = json.data?.[0]?.b64_json
    if (!b64) return fail('no image in response')

    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const alienBlob = new Blob([bytes], { type: 'image/png' })
    const newStorageId = await ctx.storage.store(alienBlob)

    await ctx.runMutation(internal.aliens.finishTransform, {
      photoId: args.photoId,
      status: 'ready' as const,
      storageId: newStorageId,
    })
  },
})

// Mark the transform done: 'ready' swaps in the alien texture (live-updates
// every open universe); 'failed' leaves the original image in place.
export const finishTransform = internalMutation({
  args: {
    photoId: v.id('photos'),
    status: v.union(v.literal('ready'), v.literal('failed')),
    storageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get('photos', args.photoId)
    if (!photo) return
    await ctx.db.patch('photos', args.photoId, {
      status: args.status,
      ...(args.storageId ? { storageId: args.storageId } : {}),
    })
  },
})
