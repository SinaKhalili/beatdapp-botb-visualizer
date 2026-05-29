import { v } from 'convex/values'
import { internalAction, internalMutation } from './_generated/server'
import { internal } from './_generated/api'

// Convex actions expose env vars via process.env at runtime; declare its shape
// since the Convex tsconfig doesn't include Node types.
declare const process: { env: Record<string, string | undefined> }

// Turns an uploaded photo into a psychedelic-alien version with OpenAI's image
// edit endpoint, then swaps the planet's texture in place. Runs in the
// background (scheduled from addUploadedPhoto) so the planet shows instantly and
// transforms a moment later.
//
// Cost kept low: gpt-image-1-mini (the cost-efficient model), quality "low",
// smallest size.

const PROMPT =
  'Give the subject of this photo a SLIGHT psychedelic alien makeover while ' +
  'keeping them clearly recognizable: keep the same face, pose, and ' +
  'composition, but tint the skin with otherworldly cosmic colors, add a hint ' +
  'of subtle alien features and a trippy neon glow with swirling galaxy tones ' +
  'in the background. Tasteful and surreal, not a full replacement.'

export const transform = internalAction({
  args: { photoId: v.id('photos'), storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not set on this deployment')
      return
    }

    const blob = await ctx.storage.get(args.storageId)
    if (!blob) {
      console.error('source image missing for', args.storageId)
      return
    }

    const ext =
      blob.type === 'image/jpeg'
        ? 'jpg'
        : blob.type === 'image/webp'
          ? 'webp'
          : 'png'

    const form = new FormData()
    form.append('model', 'gpt-image-1-mini')
    form.append('image', blob, `input.${ext}`)
    form.append('prompt', PROMPT)
    form.append('size', '1024x1024')
    form.append('quality', 'low') // cheapest
    form.append('n', '1')

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })

    if (!res.ok) {
      console.error('OpenAI image edit failed', res.status, await res.text())
      return
    }

    const json = (await res.json()) as {
      data?: Array<{ b64_json?: string }>
    }
    const b64 = json.data?.[0]?.b64_json
    if (!b64) {
      console.error('OpenAI returned no image')
      return
    }

    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const alienBlob = new Blob([bytes], { type: 'image/png' })
    const newStorageId = await ctx.storage.store(alienBlob)

    await ctx.runMutation(internal.aliens.setAlienImage, {
      photoId: args.photoId,
      storageId: newStorageId,
    })
  },
})

// Point the planet at its alien texture (live-updates every open universe).
export const setAlienImage = internalMutation({
  args: { photoId: v.id('photos'), storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get("photos", args.photoId)
    if (!photo) return
    await ctx.db.patch("photos", args.photoId, { storageId: args.storageId })
  },
})
