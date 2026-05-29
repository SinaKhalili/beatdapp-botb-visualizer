# BOTB Universe — Live Galaxy Screen (Design)

Live "universe" displayed on a venue TV. Attendee photos appear as planets
floating in a psychedelic galaxy, each labeled with a name/company. The screen
auto-pilots through space and refreshes itself as new photos arrive — no one
touches the laptop all night.

This phase: **visuals first**. Google Drive sync is out of scope; we seed
placeholder photos and make the live-update path real via Convex so Drive sync
later is just "insert a row".

## Decisions

- **Camera:** auto-pilot drift tour (unattended TV).
- **Photo style:** each photo is its own planet, with the photo as a billboard
  orbiting it + a name/company label.
- **Stack:** React Three Fiber (Three.js) + drei.
- **Aesthetic:** psychedelic & vibrant (saturated purples/teals/magentas,
  glowing nebulae).
- **Data:** Convex-backed, seeded with placeholders; live subscription.

## Data layer (Convex)

`photos` table: `{ name, company, imageUrl, seed }` (+ `_creationTime`).
- `seed`: random number stored at insert → deterministic, stable placement.
- `listPhotos` (query): live subscription, ordered by creation. New rows = new
  planets that animate in.
- `addPhoto` (mutation): single entry point used by the seed script now and the
  Drive sync later.
- `seedPhotos` (mutation): inserts ~15–20 placeholders if the table is empty
  (mock names/companies, `picsum.photos` seeded image URLs).

**Growth / placement:** each planet's position derives from its index via a
golden-angle spiral (`angle = i × 137.5°`, `radius = c × √i`) with seed-driven
vertical jitter. Planets spread evenly outward and never overlap; the galaxy
grows organically on the rim as rows are added. Stable because it's derived from
stable data.

## Scene (React Three Fiber)

- Fullscreen `<Canvas>`, **client-only** (TanStack Start does SSR; WebGL can't
  render server-side — guard with a mounted flag).
- `Starfield`: large twinkling point field.
- `Nebula`: a few big additive-blended, color-shifting cloud sprites for
  atmosphere/depth.
- `Planet` (per photo): emissive sphere, hue from `seed`, slow self-rotation.
- `PhotoBillboard`: plane textured with the photo, drei `<Billboard>` (always
  faces camera), glowing frame, orbits its planet.
- `Label`: drei `<Text>` "Name — Company" under the billboard.
- `AutoPilotCamera`: drifts through space via `useFrame`, occasionally easing
  toward the newest planet. New planets scale in on arrival.

**Auto-refresh:** Convex reactivity — insert a row, a planet fades in. No
polling.

**Performance:** expect up to a few hundred photos. Lazy-load textures via
Suspense; revisit instancing only if needed (YAGNI).

## Route

Dedicated fullscreen route `/universe` (the single URL the laptop opens). The
starter demo at `/` stays as reference.
