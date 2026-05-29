# beatdapp-botb-visualizer

A live "BOTB Universe" — a fullscreen, psychedelic WebGL galaxy meant to run on a
venue TV. Attendee photos appear as planets floating in a star-filled galaxy,
each with a name/company label, while the camera auto-pilots through space and a
music-style visualizer (wave terrain, beat pulses, shockwaves, waveform ribbons)
reacts in time.

Built with React Three Fiber, TanStack Start, and Convex.

## Stack

- **React Three Fiber / three.js / drei** — 3D scene, planets, billboards
- **@react-three/postprocessing** — bloom
- **leva** — live control panel (press `H` to toggle)
- **TanStack Start + Router** — app framework / routing
- **Convex** — realtime backend (`photos` table); new rows appear as new planets
- **Cloudflare Workers** — hosting (`@cloudflare/vite-plugin` + wrangler)

## Routes

- `/` — landing page (Universe / Upload)
- `/universe` — the fullscreen galaxy

## Develop

```bash
npm install
npm run dev
```

You'll need a Convex deployment. Copy `.env.example` to `.env.local` and set
`VITE_CONVEX_URL` (run `npx convex dev` to create one). The scene seeds a few
placeholder attendees on first load.

## Deploy (Cloudflare Workers)

```bash
npx wrangler login
npm run deploy
```

`npm run deploy` builds the frontend against the production Convex URL and uploads
the Worker. Deploy credentials can be supplied via `.dev.vars`
(`CLOUDFLARE_API_TOKEN`, `CONVEX_DEPLOY_KEY`) — that file is gitignored and must
never be committed.

## License

MIT
