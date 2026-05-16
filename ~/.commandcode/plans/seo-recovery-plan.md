# CineXP — SEO Indexing Recovery Plan

## What's Actually Wrong (Code-Verified Diagnosis)

### 6 AIs, 6 Diagnoses — Here's What the Code Actually Says

| AI | Claim | Code Reality |
|---|---|---|
| **DeepSeek** | TMDB failure → noindex injection | ✅ **CONFIRMED** — `page.tsx:41` returns `robots: { index: false }` on ANY TMDB failure |
| **Bigpickle** | SSR bailout from useSearchParams | ⚠️ **PARTIAL** — Real but impacts only client component subtree, not whole page |
| **GPT 5.5** | Sitemap instability / URL churn | ✅ **CONFIRMED** — `lastModified: new Date()` churn + popularity-dependent URLs |
| **Qwen** | Historical canonical mismatch | ✅ **CONFIRMED** — `http://cinexp.site/` still appears in GSC; 307 redirect in middleware |
| **Kimi** | Canonical cascade failure | ✅ **CONFIRMED** — Mixed http/https + non-www/www signals |
| **MiniMax** | Redirect + thin content | ⚠️ **PARTIAL** — Redirect is real; thin content is a secondary factor |

### Root Cause Ranking (Probability)

1. **TMDB noindex injection (40%)** — If TMDB API had any outage/rate-limit during April 22-25, `generateMetadata` injected `robots: { index: false }` on ALL media pages. Googlebot revisited, saw noindex, dropped pages from index. This explains the system-wide crash.

2. **Canonical/redirect confusion (30%)** — `http://cinexp.site/` and `https://www.cinexp.site/` both in GSC. The middleware uses 307 (temporary) for HTTP→HTTPS. Google sees inconsistent signals and may pick one canonical at expense of the other.

3. **Sitemap volatility (20%)** — 35+ TMDB calls per sitemap request, `lastModified: new Date()` on every entry, popularity-based URLs. Previously indexed pages can vanish from sitemap overnight.

4. **Googlebot rendering gaps (10%)** — Player, downloads, and interactive elements are client-rendered. Googlebot sees text-only page without visual richness.

---

## The GSC Data Tells the Story

```
Timeline:
Apr 17-19: Site begins getting crawled (0-2 clicks)
Apr 20:    PEAK — 18 clicks, 52 impressions
Apr 21-22: Declining (7, 5 clicks)
Apr 23-29: CRASH — 0 clicks for 7 straight days
Apr 30-May 13: Sporadic blips, never recovered
```

**12 pages "Crawled - currently not indexed"** — validation FAILED (ongoing).

**Top affected pages**: dacoit, tu-yaa-main, adulterers, siren — all media detail pages.

---

## Step-by-Step Fix Plan

### Phase 1 — Emergency Code Fixes (highest impact, ~15 min)

#### Fix 1: Remove Noindex Injection (`src/app/media/[type]/[id]/page.tsx`)

**Line ~41** — Change `generateMetadata`:

```tsx
// BEFORE:
if (!details) return { title: "Not Found", robots: { index: false, follow: false } };

// AFTER:
if (!details) {
  return {
    title: "CineXP — Stream Free Movies & TV",
    description: "Watch the latest movies and TV shows online free in HD on CineXP.",
    // NO robots noindex — let Google decide
  };
}
```

**Line ~80** — Change page component fallback from `notFound()` to graceful UI:

```tsx
// BEFORE:
if (!details) return notFound();

// AFTER:
if (!details) {
  return (
    <div className="page-wrapper container" style={{ paddingTop: "20vh", textAlign: "center" }}>
      <h1>Content Temporarily Unavailable</h1>
      <p style={{ opacity: 0.7 }}>We're having trouble loading this title. Please try again shortly.</p>
      <Link href="/">Browse Available Titles</Link>
    </div>
  );
}
```

> This is the #1 fix. Every TMDB hiccup was telling Google "don't index this page." Fix this first.

#### Fix 2: Suspense Boundary for MediaInteractive (`src/app/media/[type]/[id]/page.tsx`)

Wrap `<MediaInteractive>` in `<Suspense>` with a meaningful fallback. Add `import { Suspense } from "react"` at top.

The `<MediaInteractive>` call (~line 260) becomes:

```tsx
<Suspense fallback={
  <div style={{ aspectRatio: '16/9', width: '100%', background: '#0a0510', borderRadius: '16px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(157,0,255,0.15)' }}>
    <div style={{ textAlign: 'center', opacity: 0.7 }}>
      <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Loading player...</p>
      <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>{title} — Stream free in HD on CineXP</p>
    </div>
  </div>
}>
  <MediaInteractive id={id} type={type} ... />
</Suspense>
```

> Googlebot now sees: title, poster, overview, genres, and "Loading player" — much better than a blank div.

### Phase 2 — Sitemap Stabilization (~30 min)

#### Fix 3: Rewrite `src/app/sitemap.ts`

Three changes:
1. **Add `export const revalidate = 21600`** — ISR cache for 6 hours (stops regenerating on every request)
2. **Use `STABLE_DATE`** instead of `new Date()` — stops Google's churn detection
3. **Persistent fallback** — when TMDB fails, return 50-100 hardcoded important URLs instead of just 4

#### Fix 3b: Optimize `getSEOPrebuildData()` in `src/lib/tmdb.ts`

- Reduce `PAGES` from 5 to 2 (10 TMDB calls instead of 35)
- Add in-memory cache with 6-hour TTL

### Phase 3 — Redirect Fix (~5 min)

#### Fix 4: `src/proxy.ts` line ~55

```tsx
// BEFORE:
return NextResponse.redirect(httpsUrl)

// AFTER:
return NextResponse.redirect(httpsUrl, 301)  // permanent
```

**Also**: If Cloudflare has "Always Use HTTPS" enabled, remove the HTTPS enforcement block from proxy.ts entirely (lines 45-55) — it's redundant edge work.

### Phase 4 — Post-Deploy Actions

1. **Cloudflare**: Enable "Always Use HTTPS" + add Bulk Redirect: `http://cinexp.site/*` → `https://www.cinexp.site/*` (301)
2. **GSC**: Resubmit sitemap after deploy
3. **GSC**: Use URL Inspection tool on top 3 pages (dacoit, tu-yaa-main, adulterers) → "Request Indexing"
4. **Do NOT spam** re-indexing requests — Google penalizes this
5. **Avoid unnecessary deploys** for 2-3 weeks — let Google recrawl naturally

---

## What NOT to Do

| Don't | Why |
|---|---|
| Don't add Redis/DB caching for TMDB | Overengineered. TMDB's built-in `revalidate` + in-memory is enough. |
| Don't pre-render all pages at build time | Would explode build times and Vercel usage. |
| Don't switch to client-side TMDB calls | Would expose API key, make Googlebot see empty pages. |
| Don't remove `wsrv.nl` image proxy | TMDB images are blocked in some regions. |
| Don't add sitemap index with pagination | 600 URLs in one sitemap is fine (limit is 50,000). |
| Don't spam "Request Indexing" in GSC | Google penalizes aggressive indexing requests. |
| Don't remove `dynamicParams = true` | Would prevent non-popular pages from being served at all. |

---

## Vercel Usage Minimization

1. **Sitemap ISR caching** (`revalidate: 21600`) — Vercel caches the response, not regenerating on every request
2. **In-memory TMDB cache** for `getSEOPrebuildData()` — 6-hour TTL, shared across requests
3. **Stable `lastModified`** — allows Vercel Edge to serve identical 304 responses
4. **Reduce TMDB calls** — 10 per sitemap request instead of 35
5. **Remove redundant HTTPS enforcement from proxy.ts** if Cloudflare handles it
6. **Deploy once with all fixes**, then pause deploys for 2-3 weeks

---

## Recovery Monitoring (Next 2-4 Weeks)

| Timeframe | Check |
|---|---|
| Day 0-1 | Deploy all Phase 1-3 fixes |
| Day 1 | Resubmit sitemap in GSC, request indexing on top 3 pages |
| Day 3-7 | Monitor GSC Coverage report — "Crawled - not indexed" count should start dropping |
| Day 7-14 | Check for "Indexed" pages count increasing; impressions should start recovering |
| Day 14-21 | Full recovery expected if TMDB was the root cause. Watch for new issues in GSC. |
| Day 28+ | Consider adding the persistent sitemap fallback URLs if recovery is incomplete |

---

## Files Changed

1. `src/app/media/[type]/[id]/page.tsx` — Emergency fix #1 + #2 (noindex removal + Suspense)
2. `src/app/sitemap.ts` — Fix #3 (stable sitemap with caching)
3. `src/lib/tmdb.ts` — Fix #3b (reduced API calls + in-memory cache)
4. `src/proxy.ts` — Fix #4 (301 redirect)
5. Cloudflare dashboard — HTTPS enforcement + bulk redirect rule

---

## Verification

After deploying all fixes:
1. Visit `https://www.cinexp.site/sitemap.xml` — should return ~600 URLs with stable `lastModified`
2. Visit `https://www.cinexp.site/media/movie/1220522-dacoit` — view source, confirm no `noindex` in meta
3. Visit `http://cinexp.site/` — should redirect to `https://www.cinexp.site/` with a single 301
4. GSC URL Inspection on dacoit page — should show "Page is indexed" or "URL is available to Google"
5. GSC Coverage report — "Crawled - not indexed" count should decrease over 1-2 weeks
