## Velora v2 — Complete rebuild

A top-to-bottom redesign of every screen following your exact spec: pure black background, single violet accent (#7C3AED), Inter 400/500 only, pill buttons, zero shadows, 200ms transitions, mobile-first, optimized for 4GB Android.

### 1. Design system reset (`src/styles.css`)
- Replace existing tokens with: bg `#000`, surface `#1C1C1E`, sidebar `#0A0A0A`, text `#FFFFFF`, muted `#888`, online `#22C55E`, accent `#7C3AED`
- Inter font, weights 400/500 only
- Remove ALL glass, neon, shadow, blob, glow utilities and keyframes
- Add: `dot-bounce`, `pulse-dot`, `spin-slow` keyframes
- `@media (prefers-reduced-motion)` disables all animations
- `body { overscroll-behavior: none; background: #000 }`

### 2. Homepage (`src/routes/index.tsx`)
Centered hero, one-tap guest, feature row (3 icons), phone mockup frame, Safety footer link. Removes existing landing's gradient/glass styling. SEO meta updated; twitter:card added.

### 3. Auth (`src/routes/auth.tsx`)
Guest button first (large violet pill). Divider with "or". Ghost email button. Drop gender from signup form.

### 4. App shell (`src/components/app-shell.tsx`)
- Mobile: hide bottom nav inside DM chat AND random chat (already done) — restyle to pure black, no border, simpler
- Desktop: 280px left sidebar `#0A0A0A` containing DM list directly when on `/messages` routes, else compact nav

### 5. DM list (`src/routes/_authenticated.messages.index.tsx`)
72px rows, avatar + online dot, username, last message preview / "typing…", timestamp + unread violet badge or violet eye for seen. Search bar at top. No dividers.

### 6. DM chat (`src/routes/_authenticated.messages.$userId.tsx`)
- iMessage-style bubbles (violet mine / `#1C1C1E` theirs, asymmetric radii)
- Per-bubble HH:MM timestamps
- Sent/delivered/seen ticks under my messages (track via `room_reads.last_read_at` vs message `created_at`)
- Typing indicator: pure-CSS 3-dot bounce, broadcast via Supabase Realtime presence/broadcast channel
- Auto-scroll, virtualized only if >100 messages (keep deps light — skip react-window, use simple slice of last 60 + load-older button to stay under 150KB)
- Visual viewport keyboard fix (JS effect adjusting bottom offset)
- Swipe-right-to-back gesture
- Three-dot menu → bottom sheet (Report / Block)
- Back arrow → `/messages` (never `/`)

### 7. Random chat (`src/routes/_authenticated.random.tsx`)
- Waiting screen: centered violet spinner, "Finding your match…", live waiter count (queries `match_queue` every 5s), >30s message swap, bottom Cancel link
- Active chat reuses chat UI + floating "Next person →" ghost pill above input

### 8. Safety page (`src/routes/safety.tsx`)
Four sections per spec, plain dark layout.

### 9. Misc
- Favicon: inline SVG "V" violet on black (`public/favicon.svg` + link in root head)
- Remove existing ambient-background usage
- Root head: preconnect to Supabase URL, twitter:card, updated default meta
- Lovable badge: handled via publish settings (will toggle off)

### Technical notes
- No new deps; keep bundle lean. Drop framer-motion usage on landing (CSS only).
- Typing presence: Supabase Realtime `channel.track({ typing: bool })`; debounced 1.5s.
- Read receipts: when chat opens or new message arrives while focused, upsert `room_reads`. Render seen state for my last message by comparing `created_at <= other.last_read_at` from `room_reads` subscription.
- Online count on landing: `count(*)` on `profiles where is_online`, refresh 10s.
- Skip animations under `prefers-reduced-motion`.

### Files touched
- edit: `src/styles.css`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/routes/auth.tsx`, `src/components/app-shell.tsx`, `src/routes/_authenticated.messages.index.tsx`, `src/routes/_authenticated.messages.$userId.tsx`, `src/routes/_authenticated.random.tsx`, `src/routes/_authenticated.discover.tsx` (restyle), `src/routes/_authenticated.profile.tsx` (restyle)
- create: `src/routes/safety.tsx`, `public/favicon.svg`, `src/lib/use-keyboard-inset.ts`, `src/lib/use-swipe-back.ts`

After approval I'll implement in one pass and verify the build.