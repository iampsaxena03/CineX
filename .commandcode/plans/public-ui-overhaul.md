# CineXP Public-Site UI/UX Overhaul Plan

## 1. Current-State Assessment

**What's good (keep):**
- Dark-only AMOLED palette (`#04010a` + purple accents) — directionally correct
- Glassmorphism system (`GlassSurface`, SVG filters) — premium foundation
- Motion-powered dock, scroll-reveal, card hover — smooth and functional
- Admin-controlled homepage sections via `HomeSection` DB table — solid CMS
- PWA install with cooldown — works
- Ad system isolated in sandboxed iframes — functional
- SEO (JSON-LD, sitemap, metadata) — good shape

**What's weak:**
- Hero is a static gradient H1 ("Welcome to CineXP!") — no action, no content
- Search is a full page navigation away — slow on mobile
- Dock labels invisible on mobile (hover-only tooltips)
- Detail page poster + text layout feels dated, not cinematic
- Feed page is bare TikTok clone — no visual polish at all
- Download pages are token-based empty directories (no UI to improve there)
- Cards are functional but visually identical to every TMDB-powered site

## 2. Visual/UX Direction

**Palette update** (`:root` in globals.css):
```
--background:      #000000;        /* true AMOLED black */
--foreground:      #f2f0f7;        /* slightly warmer white */
--primary:         #7c00e6;        /* deeper purple */
--primary-glow:    rgba(124, 0, 230, 0.5);
--secondary:       #3d0078;
--accent:          #b57cff;
--card-bg:         #080312;        /* barely-above-black */
--card-border:     rgba(255, 255, 255, 0.05);
--glass-bg:        rgba(12, 4, 30, 0.95);
--glass-border:    rgba(124, 0, 230, 0.35);
```

**Type scale:** Slightly larger mobile text, tighter line-height for titles, increased letter-spacing on labels.

**Spacing:** Tighter horizontal padding on mobile (1rem instead of 2rem). Larger gaps between homepage sections.

**Glass treatment:** Reduce chromatic aberration on dock glass (fewer SVG artifacts). Use simpler backdrop-blur approach for non-dock glass.

**Motion:** Add `will-change: transform` to animated elements. Use `layout` prop on motion components sparingly.

## 3. Screen-by-Screen Changes

### A. Homepage (`src/app/page.tsx`)

**Hero section — replace entirely:**

- **Data source:** Reuse existing `getTrending('IN')` call already fetched. Pick item #0 as featured title.
- **Fallback chain:** trending[0] → a hardcoded featured fallback (pick a known popular title with TMDB id).
- **Layout:** Full-viewport-height hero on mobile. Backdrop image (from `getBackdropUrl`) with deep gradient overlay fading to `#000000` at bottom. Poster overlay on left for desktop, centered on mobile.
- **Content:** Title (h1, gradient text), year + rating badge row, genre pills, short overview (1-2 lines), "Watch Now" button (link to `media/type/slug`).
- **Behavior:** Scroll-down triggers hero to collapse/minimize (same pattern as Navbar hide-on-scroll). Content sections slide up over it.
- **Keep:** Same data fetching, same ISR revalidation, same admin section logic below hero. Only replace the `h1` block.

**Section headers — polish:**
- Replace current `h2` style with: smaller uppercase label + emoji/icon, tighter to content.
- Add subtle horizontal rule (1px `rgba(255,255,255,0.04)`) between sections.

### B. Mobile Search (`src/components/ui/Navbar.tsx` + new component)

**Replace dock search icon behavior:**
- Currently routes to `/search`. Instead: open an inline dropdown/overlay.
- New component: `src/components/ui/SearchOverlay.tsx`
  - Full-width dropdown anchored below dock area
  - Same debounced TMDB API call (`/api/tmdb/search`)
  - Dropdown items: poster thumbnail (45x68) + title + year + type badge — like `AdminSearch` but consumer-polished
  - "View all results" link to `/search` at bottom
  - Close on backdrop tap, Esc key, or result selection
  - Max 6 results in dropdown (rest via "View all")
- Keep existing `/search` page as full-results destination
- Dock search icon opens overlay; second tap or typing dismisses

### C. Dock (`src/components/ui/Dock.tsx` + `Navbar.tsx`)

**Keep:** macOS magnification, glass surface, spring physics, hide-on-scroll behavior.

**Enhance:**
- **Mobile labels via long press:** Add `useLongPress` handler to `DockItem`. On long press (500ms hold), show label above the icon for 2s then auto-dismiss. No hover required.
- Existing `DockLabel` component already receives `isHovered` motion value — add `isLongPressed` state and show label for both hover AND long press.
- **Visual polish:** Reduce dock height by 8px on mobile. Reduce `baseItemSize` to 44 on mobile (`<=768px`). Tighter icon spacing.

### D. Detail/Media Page (`src/app/media/[type]/[id]/page.tsx`)

**Keep:** Backdrop, poster+info header, MediaInteractive player section, similar grid, ads, JSON-LD.

**Changes:**
- Backdrop opacity increase from `0.12` to `0.18`. Gradient overlay starts at `rgba(0,0,0,0.3)` instead of `rgba(4,1,10,0.5)`.
- Move "Back to Browse" link into a fixed top bar (transparent, disappears on scroll).
- Poster: larger on desktop (`clamp(180px, 22vw, 300px)`), stronger glow shadow.
- Title: gradient text (white → accent) instead of flat white.
- Info pill row: unified pill style (all get the same `rgba(124,0,230,0.12)` background, not mismatched).
- Overview: increase line-height to `1.9`, max-width to `800px`.
- Genre pills: keep but make slightly larger (`0.9rem` font).
- Similar grid header: "You Might Also Like" → "More Like This" with smaller, cleaner heading.

### E. Player (`src/components/ui/StreamPlayer.tsx` + `MediaInteractive.tsx`)

**Keep:** All 10 providers, iframe/Plyr switching, quality selection, PiP, fullscreen, progress tracking.

**Changes:**
- Loading state: replace pulsing circle with a poster-based shimmer (use `posterUrl` prop from `MediaInteractive`).
- Provider switcher pills: increase border-radius (`20px`), add subtle glow on active provider.
- "More providers" dropdown: glass surface background, smoother open/close with AnimatePresence.
- Download section in `MediaInteractive`: keep layout, improve card style — compact row with file size badges, quality badges, "Download" button with download icon.

### F. Feed/Reels (`src/components/TrailerFeedClient.tsx`)

**Changes:**
- Add subtle gradient overlay on each reel (bottom 30%, `#000` → transparent) to improve text readability.
- Reel controls (play/pause, mute, seek): move to bottom-left, increase touch targets.
- Progress bar: thicker (3px), purple tint, smoother transition.
- Title overlay: larger, add year + type badge.
- Share/watchlist buttons: consistent pill style matching other screens.
- Ad slides: add a thin purple border-left to distinguish from content, keep "Sponsored" label.

### G. Other Pages

**Movies, TV, Trending, Watchlist, Genres pages** — minimal changes:
- Page title: gradient text treatment matching detail page.
- Grid: same card styles (updated below).
- Genres page: keep `ScrollReveal` wrapper, add tighter spacing.

**PWA Install (`src/components/ui/InstallPWA.tsx`)** — keep exactly as is. It's already subtle.

## 4. Key Component/Style Areas to Touch

### Files to modify:

| File | Changes |
|------|---------|
| `src/app/globals.css` | Palette update (token values), card hover glow, section spacing, mobile breakpoint tweaks, grid gap, button refinement, dock label long-press style, hero collapse animation, genre pill polish |
| `src/app/page.tsx` | Replace static H1 hero with featured-title hero (backdrop + poster + "Watch Now"), add scroll-collapse behavior |
| `src/components/ui/Navbar.tsx` | Dock search icon → opens SearchOverlay instead of routing |
| `src/components/ui/Dock.tsx` | `useLongPress` on DockItem for mobile label reveal |
| `src/components/ui/SearchOverlay.tsx` | **New file** — dropdown search component |
| `src/components/MediaCard.tsx` | Updated hover shadow, slightly tighter info padding, poster border-radius increase |
| `src/app/media/[type]/[id]/page.tsx` | Backdrop opacity, poster sizing, title gradient, pill unification, overview spacing |
| `src/components/MediaInteractive.tsx` | Provider switcher pill glow, download card polish, poster prop passthrough |
| `src/components/ui/StreamPlayer.tsx` | Loading state improvement (accept `posterUrl` prop) |
| `src/components/TrailerFeedClient.tsx` | Gradient overlay, control repositioning, progress bar thickness |
| `src/components/ui/Top10Row.tsx` | Minor spacing/glow polish |
| `src/components/ads/ReelAdSlide.tsx` | Purple border-left visual distinction |

### Files NOT to touch:
- All API routes (`src/app/api/**`)
- All admin pages (`src/app/admin/**`)
- All lib files (`src/lib/**`)
- Prisma schema
- next.config.ts
- PWA config
- Telegram bot
- Scraper pipeline
- Cache/proxy logic
- HistoryTracker, CacheBuster
- SEO files (robots.ts, sitemap.ts, metadata)

## 5. Performance & Mobile UX Safeguards

- **No new dependencies.** Use existing `motion`, `react-icons/vsc`, existing hooks.
- **CSS-only where possible.** Hero collapse, card hovers, dropdown show/hide — prefer CSS transitions over Motion for simple effects.
- **Lazy load hero backdrop.** Use `loading="lazy"` on backdrop img (below fold perception). Poster uses `fetchPriority="high"`.
- **Debounced search stays at 300ms.** No change.
- **Mobile dock:** Long press timeout at 500ms, label auto-dismiss after 2s. No persistent DOM for mobile labels.
- **Grid repaints:** Add `content-visibility: auto` to grid sections on homepage for off-screen rows.
- **`will-change`:** Add only to dock and hero elements. Remove from low-priority elements.
- **Image optimization:** `unoptimized: true` is already set (CDN-driven). Keep.
- **Core Web Vitals:** Hero LCP will be poster img (small, fast). Avoid layout shift by reserving hero min-height in CSS.

## 6. What Must Not Change

- Backend behavior, APIs, streaming logic, proxy, scraper
- Admin panel UI or functionality
- PWA manifest, service worker, install prompt logic
- Ad placement positions (after Top 10, after Trending, on detail page, in reels) — only visual integration changes
- Watch history mechanism (localStorage)
- Download flow (token-based)
- SEO metadata, JSON-LD, sitemap, canonical URLs
- ISR revalidation values
- Auth / admin login
- Analytics (Vercel)
- `next.config.ts`

## 7. Verification Checklist

- [ ] Homepage hero renders featured title from trending (not "Welcome to CineXP!")
- [ ] Hero backdrop + poster visible, "Watch Now" button links correctly
- [ ] Hero collapses on scroll down, content sections visible below
- [ ] Fallback hero works when trending API fails
- [ ] Mobile: dock search icon opens inline dropdown (not full page nav)
- [ ] Search dropdown shows results with thumbnails, "View all" link works
- [ ] Mobile: long-pressing dock icon shows label for 2s
- [ ] Mobile: dock icon tap still navigates (no regression)
- [ ] Detail page: backdrop more visible, poster larger, pills unified
- [ ] Detail page: "Watch Now" → player section scroll (if from hero)
- [ ] Player: loading state shows poster-based shimmer
- [ ] Provider switcher pills have glow on active
- [ ] Feed: gradient overlay visible, controls repositioned, progress bar thicker
- [ ] Ad slides in feed have purple border-left
- [ ] Ad slots on homepage and detail page still appear in same positions
- [ ] PWA install prompt unchanged
- [ ] All admin pages unaffected
- [ ] `npm run build` succeeds with no new errors
- [ ] Mobile (<480px), tablet (<768px), and desktop all look correct
- [ ] Lighthouse mobile score does not regress
