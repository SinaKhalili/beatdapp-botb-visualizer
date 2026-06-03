import { v } from 'convex/values'
import {
  internalAction,
  internalMutation,
  internalQuery,
} from './_generated/server'
import { internal } from './_generated/api'

// Loose shape of a Snappic webhook event (only the bits we use).
type BoothEvent = {
  type?: string
  event_id?: number
  session?: {
    id?: string | number
    type?: string
    direct_url?: string | null
    original_session?: { id?: string | number } | null
  }
  survey?: {
    data_capture?: {
      sections?: Array<{ fields?: Array<{ value?: unknown }> }>
    }
  }
}

function firstSurveyAnswer(survey: BoothEvent['survey']): string | null {
  for (const sec of survey?.data_capture?.sections ?? []) {
    for (const f of sec.fields ?? []) {
      if (typeof f.value === 'string' && f.value.trim()) return f.value.trim()
    }
  }
  return null
}

// Process one webhook event body: import AI photos, capture survey answers, and
// keep them joined regardless of arrival order. Ignores stills, gifs, shares,
// and the vendor's example.com/event_id:1 test samples.
export const ingest = internalMutation({
  args: { body: v.string() },
  handler: async (ctx, args) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(args.body)
    } catch {
      return
    }
    if (typeof parsed !== 'object' || parsed === null) return
    const evt = parsed as BoothEvent
    if (evt.event_id === 1) return // vendor sample
    const session = evt.session
    if (!session) return
    const directUrl = session.direct_url ?? undefined
    if (directUrl && directUrl.includes('example.com')) return

    // ── Survey: record the "world" answer + label any matching photo ──
    if (evt.type === 'survey') {
      const sessionId = String(session.id)
      const world = firstSurveyAnswer(evt.survey)
      if (!world) return
      const existing = await ctx.db
        .query('boothSurveys')
        .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
        .first()
      if (existing) await ctx.db.patch('boothSurveys', existing._id, { world })
      else await ctx.db.insert('boothSurveys', { sessionId, world })

      // A photo may already exist whose still-session is this survey's session.
      const photos = await ctx.db
        .query('photos')
        .withIndex('by_originalSession', (q) =>
          q.eq('originalSessionId', sessionId),
        )
        .collect()
      for (const p of photos) {
        await ctx.db.patch('photos', p._id, { company: world })
      }
      return
    }

    // ── AI session: create one planet from the styled composite ──
    if (evt.type === 'session' && session.type === 'ai' && directUrl) {
      const externalId = String(session.id)
      const originalSessionId = session.original_session?.id
        ? String(session.original_session.id)
        : undefined

      // Dedup retries/replays.
      const existing = await ctx.db
        .query('photos')
        .withIndex('by_externalId', (q) => q.eq('externalId', externalId))
        .first()
      if (existing) return

      // Find the "world" from the survey on the linked still (or this session).
      let world: string | null = null
      for (const key of [originalSessionId, externalId]) {
        if (!key) continue
        const sv = await ctx.db
          .query('boothSurveys')
          .withIndex('by_session', (q) => q.eq('sessionId', key))
          .first()
        if (sv) {
          world = sv.world
          break
        }
      }

      await ctx.db.insert('photos', {
        name: '',
        company: world ?? 'Unknown World',
        imageUrl: directUrl,
        seed: Math.floor(Math.random() * 1_000_000),
        status: 'ready',
        externalId,
        originalSessionId,
      })
      return
    }
    // Everything else (still/gif sessions, shares) is intentionally ignored.
  },
})

// Bodies of all stored webhook events, oldest first (for backfill/re-sync).
export const allEventBodies = internalQuery({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query('webhookEvents').collect()
    events.sort((a, b) => a._creationTime - b._creationTime)
    return events.map((e) => e.body)
  },
})

// Re-run ingest over every captured webhook event (idempotent via dedup).
export const reprocess = internalAction({
  args: {},
  handler: async (ctx) => {
    const bodies: Array<string> = await ctx.runQuery(
      internal.snappic.allEventBodies,
      {},
    )
    for (const body of bodies) {
      await ctx.runMutation(internal.snappic.ingest, { body })
    }
    return { processed: bodies.length }
  },
})
