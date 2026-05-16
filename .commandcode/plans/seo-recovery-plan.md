# CineXP — Complete SEO Indexing Recovery Plan (Updated)

## Executive Summary — What's Actually Wrong

After cross-referencing all 6 AI analyses against the live codebase and GSC data, here's what's confirmed:

| # | Root Cause | Verified | Impact |
|---|---|---|---|
| 1 | `page.tsx:41` injects `robots: { index: false }` on ALL media pages when TMDB fails | ✅ Code verified | Mass deindexation trigger |
| 2 | `MediaInteractive.tsx` uses `useSearchParams()` without `<Suspense>` — Googlebot sees empty space for player/downloads | ✅ Code verified | Partial page rendering |
| 3 | Sitemap calls 35+ TMDB APIs per request, `lastModified: new Date()` churn, URLs are popularity-volatile | ✅ Code verified | Index churn + Vercel cost |
| 4 | Middleware uses 307 (temporary) for HTTP→HTTPS, mixed signals with 301 non-www→www in next.config | ✅ Code verified | Canonical confusion |
| 5 | Sitemap replaces old URLs instead of growing — previously indexed URLs disappear | ✅ Desired behavior confirmed | Lost indexation |

---

## Phase 1 — Emergency Code Fixes (3 files, ~20 min)

### Fix 1: Remove Noindex Injection

**File**: `src/app/media/[type]/[id]/page.tsx` — line ~41

```tsx
// BEFORE:
if (!details) return { title: "Not Found", robots: { index: false, follow: false } };

// AFTER:
if (!details) {
  return {
    title: "CineXP — Stream Free Movies & TV",
    description: "Watch the latest movies and TV shows online free in HD on CineXP.",
    // NO robots noindex — never punish SEO for transient API failures
  };
}
```

**Line ~80** — Replace `notFound()` with graceful fallback UI:

```tsx
// BEFORE:
if (!details) return notFound();

// AFTER:
if (!details) {
  return (
    <div className="page-wrapper container" style={{ paddingTop: "20vh", textAlign: "center" }}>
      <h1>Content Temporarily Unavailable</h1>
      <p style={{ opacity: 0.7 }}>We&apos;re having trouble loading this title. Please try again in a moment.</p>
      <Link href="/">Browse Available Titles</Link>
    </div>
  );
}
```

### Fix 2: Suspense Boundary for MediaInteractive

**File**: `src/app/media/[type]/[id]/page.tsx` — add `import { Suspense } from "react"` at top, then wrap MediaInteractive:

```tsx
<Suspense fallback={
  <div style={{
    aspectRatio: '16/9', width: '100%', background: '#0a0510',
    borderRadius: '16px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', border: '1px solid rgba(157,0,255,0.15)'
  }}>
    <div style={{ textAlign: 'center', opacity: 0.7 }}>
      <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Loading player stream...</p>
      <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.6 }}>
        {title} — Stream free in HD on CineXP
      </p>
    </div>
  </div>
}>
  <MediaInteractive id={id} type={type} imdbId={...} seasons={seasons}
    title={title} posterUrl={posterUrl} year={year} industry={industry} />
</Suspense>
```

### Fix 3: Fix 307 → 301 in Middleware

**File**: `src/proxy.ts` — line ~55

```tsx
// BEFORE:
return NextResponse.redirect(httpsUrl)

// AFTER:
return NextResponse.redirect(httpsUrl, 301)
```

---

## Phase 2 — Database-Backed SEO Library (4 files, ~1 hr)

This is the architectural change that makes your sitemap **cumulative** instead of volatile. Instead of the sitemap calling TMDB on every request, it reads from a database table that only grows.

### Step 2a: Add SEOPage Model

**File**: `prisma/schema.prisma` — add AFTER the existing `ScraperCache` model:

```prisma
model SEOPage {
  id        String   @id @default(cuid())
  tmdbId    Int
  mediaType String   // "movie" or "tv"
  title     String   // Cached title from TMDB (avoids TMDB calls in sitemap)
  slug      String   // Precomputed: {tmdbId}-{title-slug}
  source    String   @default("trending") // "homepage" | "trending" | "manual"
  enabled   Boolean  @default(true)
  addedAt   DateTime @default(now())
  
  @@unique([tmdbId, mediaType])
  @@index([source, enabled])
  @@index([addedAt])
}
```

Then run:
```bash
npx prisma migrate dev --name add_seo_page
```

### Step 2b: Create SEO Sync Library

**File**: `src/lib/seo-sync.ts` (NEW FILE)

This library handles:

1. **Homepage → SEOPage sync**: Reads all `HomeSectionItem` entries, upserts into SEOPage
2. **Trending → SEOPage sync**: Fetches from TMDB, filters for Indian/foreign mix, inserts new entries
3. **Sitemap query**: Reads SEOPage entries for sitemap generation

```tsx
import { prisma } from '@/lib/admin';
import { getMediaById, type TMDBMediaItem } from '@/lib/tmdb';
import { generateSlug } from '@/lib/utils';

const SEO_PAGE_TARGET = 500;

/**
 * Sync homepage admin-selected items → SEOPage
 * Call this whenever admin adds/updates homepage sections.
 * Only ADDS new items; never removes existing ones.
 */
export async function syncHomepageToSEOPages(): Promise<number> {
  const homeItems = await prisma.homeSectionItem.findMany({
    include: { section: true },
  });

  let added = 0;
  for (const item of homeItems) {
    const exists = await prisma.sEOPage.findUnique({
      where: { tmdbId_mediaType: { tmdbId: item.tmdbId, mediaType: item.mediaType } }
    });
    if (exists) continue; // Already in library — don't duplicate

    // Fetch title from TMDB to cache it
    const details = await getMediaById(item.tmdbId, item.mediaType);
    if (!details) continue;

    const title = (details as any).title || (details as any).name;
    const slug = generateSlug(item.tmdbId, title);

    await prisma.sEOPage.create({
      data: {
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        title,
        slug,
        source: 'homepage',
      }
    });
    added++;
  }
  return added;
}

/**
 * Sync trending content from TMDB → SEOPage
 * ~60-70% Indian, ~30-40% Foreign/English, ~2-3% Other
 * Target: 500 total pages. Only adds NEW entries, never removes.
 */
export async function syncTrendingToSEOPages(): Promise<{
  added: number; total: number; indian: number; foreign: number; other: number;
}> {
  const [indianContent, foreignContent, otherContent] = await Promise.all([
    fetchIndianTMDBContent(),
    fetchForeignTMDBContent(),
    fetchOtherWorldTMDBContent(),
  ]);

  const existingCount = await prisma.sEOPage.count({ where: { enabled: true } });
  const remaining = Math.max(0, SEO_PAGE_TARGET - existingCount);

  if (remaining <= 0) {
    return { added: 0, total: existingCount, indian: 0, foreign: 0, other: 0 };
  }

  const indianTarget = Math.floor(remaining * 0.65);
  const foreignTarget = Math.floor(remaining * 0.33);
  const otherTarget = remaining - indianTarget - foreignTarget;

  const indianAdded = await insertNewPages(indianContent.slice(0, indianTarget), 'trending');
  const foreignAdded = await insertNewPages(foreignContent.slice(0, foreignTarget), 'trending');
  const otherAdded = await insertNewPages(otherContent.slice(0, otherTarget), 'trending');

  const totalAdded = indianAdded + foreignAdded + otherAdded;

  return {
    added: totalAdded,
    total: existingCount + totalAdded,
    indian: indianAdded,
    foreign: foreignAdded,
    other: otherAdded,
  };
}

async function fetchIndianTMDBContent(): Promise<TMDBMediaItem[]> {
  const { getPopularMovies, getPopularTVShows } = await import('@/lib/tmdb');
  const allResults: TMDBMediaItem[] = [];
  for (let page = 1; page <= 5; page++) {
    const [movies, tv] = await Promise.all([
      getPopularMovies(page, 'IN'),
      getPopularTVShows(page, 'IN'),
    ]);
    allResults.push(
      ...movies.map(m => ({ ...m, media_type: 'movie' } as TMDBMediaItem)),
      ...tv.map(t => ({ ...t, media_type: 'tv' } as TMDBMediaItem)),
    );
  }
  const seen = new Set<number>();
  return allResults.filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; });
}

async function fetchForeignTMDBContent(): Promise<TMDBMediaItem[]> {
  const { getTrending, getPopularMovies, getPopularTVShows } = await import('@/lib/tmdb');
  const allResults: TMDBMediaItem[] = [];
  const trending = await getTrending();
  allResults.push(...trending);
  for (let page = 1; page <= 3; page++) {
    const [movies, tv] = await Promise.all([getPopularMovies(page), getPopularTVShows(page)]);
    allResults.push(
      ...movies.map(m => ({ ...m, media_type: 'movie' } as TMDBMediaItem)),
      ...tv.map(t => ({ ...t, media_type: 'tv' } as TMDBMediaItem)),
    );
  }
  const seen = new Set<number>();
  return allResults.filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; });
}

async function fetchOtherWorldTMDBContent(): Promise<TMDBMediaItem[]> {
  const { getTrending } = await import('@/lib/tmdb');
  const trending = await getTrending();
  const INDIAN_LANGS = ['hi', 'ta', 'te', 'ml', 'kn', 'bn', 'mr', 'pa', 'gu'];
  return trending.filter(item => {
    const lang = (item as any).original_language || '';
    return lang !== 'en' && !INDIAN_LANGS.includes(lang);
  }).slice(0, 15) as TMDBMediaItem[];
}

async function insertNewPages(items: TMDBMediaItem[], source: string): Promise<number> {
  let added = 0;
  for (const item of items) {
    const title = (item as any).title || (item as any).name;
    if (!title) continue;
    const mediaType = item.media_type || 'movie';
    const slug = generateSlug(item.id, title);
    try {
      await prisma.sEOPage.upsert({
        where: { tmdbId_mediaType: { tmdbId: item.id, mediaType } },
        update: { title, slug },
        create: { tmdbId: item.id, mediaType, title, slug, source },
      });
      added++;
    } catch (e) { /* duplicate — skip */ }
  }
  return added;
}

export async function getSEOPagesForSitemap() {
  return prisma.sEOPage.findMany({
    where: { enabled: true },
    orderBy: [{ source: 'asc' }, { addedAt: 'desc' }],
  });
}
```

### Step 2c: Rewrite Sitemap to Read from Database

**File**: `src/app/sitemap.ts` — complete rewrite:

```tsx
import { MetadataRoute } from 'next';
import { getSEOPagesForSitemap } from '@/lib/seo-sync';

export const revalidate = 21600;

const STABLE_DATE = new Date('2025-01-01T00:00:00.000Z');

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: 'https://www.cinexp.site', lastModified: STABLE_DATE, changeFrequency: 'weekly', priority: 1.0 },
  { url: 'https://www.cinexp.site/movies', lastModified: STABLE_DATE, changeFrequency: 'daily', priority: 0.9 },
  { url: 'https://www.cinexp.site/tv', lastModified: STABLE_DATE, changeFrequency: 'daily', priority: 0.9 },
  { url: 'https://www.cinexp.site/trending', lastModified: STABLE_DATE, changeFrequency: 'daily', priority: 0.8 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const pages = await getSEOPagesForSitemap();
    const dynamicRoutes: MetadataRoute.Sitemap = pages.map((page) => ({
      url: `https://www.cinexp.site/media/${page.mediaType}/${page.slug}`,
      lastModified: STABLE_DATE,
      changeFrequency: 'weekly' as const,
      priority: page.source === 'homepage' ? 0.8 : 0.7,
    }));
    return [...STATIC_ROUTES, ...dynamicRoutes];
  } catch (error) {
    console.error('Sitemap generation failed:', error);
    return STATIC_ROUTES;
  }
}
```

### Step 2d: Create Admin Sync Endpoint

**File**: `src/app/api/admin/seo/route.ts` (NEW FILE)

```tsx
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/guard';
import { syncTrendingToSEOPages, syncHomepageToSEOPages, getSEOPagesForSitemap } from '@/lib/seo-sync';
import { prisma } from '@/lib/admin';
import { revalidatePath } from 'next/cache';

export async function GET(request: Request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;
  try {
    const pages = await getSEOPagesForSitemap();
    const counts = {
      total: pages.length,
      homepage: pages.filter(p => p.source === 'homepage').length,
      trending: pages.filter(p => p.source === 'trending').length,
      manual: pages.filter(p => p.source === 'manual').length,
    };
    return NextResponse.json({ pages, counts, target: 500 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load SEO pages' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;
  try {
    const { action, tmdbId, mediaType } = await request.json();
    switch (action) {
      case 'sync_trending': {
        const result = await syncTrendingToSEOPages();
        revalidatePath('/sitemap.xml');
        return NextResponse.json(result);
      }
      case 'sync_homepage': {
        const added = await syncHomepageToSEOPages();
        revalidatePath('/sitemap.xml');
        return NextResponse.json({ added });
      }
      case 'toggle': {
        if (!tmdbId || !mediaType) return NextResponse.json({ error: 'tmdbId and mediaType required' }, { status: 400 });
        const page = await prisma.sEOPage.findUnique({ where: { tmdbId_mediaType: { tmdbId, mediaType } } });
        if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 });
        const updated = await prisma.sEOPage.update({
          where: { tmdbId_mediaType: { tmdbId, mediaType } },
          data: { enabled: !page.enabled },
        });
        revalidatePath('/sitemap.xml');
        return NextResponse.json({ enabled: updated.enabled });
      }
      case 'delete': {
        if (!tmdbId || !mediaType) return NextResponse.json({ error: 'tmdbId and mediaType required' }, { status: 400 });
        await prisma.sEOPage.delete({ where: { tmdbId_mediaType: { tmdbId, mediaType } } });
        revalidatePath('/sitemap.xml');
        return NextResponse.json({ deleted: true });
      }
      case 'seed_initial': {
        const result = await syncTrendingToSEOPages();
        revalidatePath('/sitemap.xml');
        return NextResponse.json({ ...result, message: 'Initial seed complete' });
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('SEO action error:', error);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
```

### Step 2e: Auto-sync Homepage When Admin Edits Sections

**File**: `src/app/api/admin/home/sections/[sectionId]/items/route.ts`

In the `POST`, `PUT`, and `DELETE` handlers, add AFTER `revalidatePath('/')`:

```tsx
import { syncHomepageToSEOPages } from '@/lib/seo-sync';
syncHomepageToSEOPages().catch(e => console.error('Homepage SEO sync error:', e));
```

---

## Phase 3 — Update generateStaticParams (Prebuild ALL 500 pages)

**File**: `src/app/media/[type]/[id]/page.tsx` — rewrite `generateStaticParams`:

```tsx
export async function generateStaticParams() {
  try {
    const { prisma } = await import('@/lib/admin');
    // Prebuild ALL enabled SEOPages so Googlebot never triggers an ISR execution.
    // Reads from database (0 TMDB calls), so build overhead is minimal.
    const pages = await prisma.sEOPage.findMany({
      where: { enabled: true },
      orderBy: { addedAt: 'desc' },
      // No take limit — prebuild all 500+ pages
    });
    return pages.map(page => ({
      type: page.mediaType as 'movie' | 'tv',
      id: page.slug,
    }));
  } catch (err) {
    console.error('Error in generateStaticParams:', err);
    return [];
  }
}
```

This eliminates the old 600-page prebuild from TMDB and replaces it with a 500-page prebuild from the database. Fewer pages, zero TMDB calls, stable URLs, no ISR cost on crawl.

Add ISR revalidation near top of file (acts as a safety net for pages added after deploy):

```tsx
export const revalidate = 604800; // 7 days — safety net for pages added post-deploy
```

---

## Phase 4 — Poster Image Fix

**File**: `src/lib/tmdb.ts` — split into server-safe + client fallback:

```tsx
// Server-side: direct TMDB (Googlebot-friendly)
export function getImageUrl(path: string | null | undefined, size = 'w500'): string {
  if (!path) return '';
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

// Client-side fallback: wsrv.nl proxy (for Indian ISP compatibility)
export function getClientImageUrl(path: string | null | undefined, size = 'w500'): string {
  if (!path) return '';
  const tmdbUrl = `image.tmdb.org/t/p/${size}${path}`;
  return `https://wsrv.nl/?url=${encodeURIComponent(tmdbUrl)}&output=webp&q=65`;
}
```

---

## Architecture Diagram

```
ADMIN PANEL
  │
  ├─ Add homepage item → auto-sync → SEOPage (INSERT only)
  └─ "Sync Trending" button → fetches TMDB → SEOPage (INSERT new)
                                    │
                                    ▼
                              SEOPage TABLE
                         (cumulative, never shrinks)
                                    │
                    ┌───────────────┴──────────────┐
                    ▼                               ▼
             GET /sitemap.xml             generateStaticParams
             (1 DB query,                 (reads ALL 500+ from DB,
              0 TMDB calls,                  prebuilds all at deploy)
              ISR cached 6h)
                    │                               │
                    ▼                               ▼
              Google crawls              All 500 pages serve from CDN
              all URLs from               instantly (0 exec cost per
              sitemap                     request — prebuilt at deploy)
                                               │
                                               ▼
                                    7-day ISR revalidation acts as
                                    safety net for pages added
                                    after deploy (admin adds new
                                    homepage item → next deploy
                                    prebuilds it)
                                               │
                                               ▼
                                    Cloudflare caches at edge
                                    (Cache Rule: /media/* 7d)
```

---

## Vercel Usage Comparison

| Metric | Before | After |
|---|---|---|
| Prebuilt pages per deploy | 600 | 500 |
| TMDB calls per build | 35+ | 0 |
| TMDB calls per sitemap request | 35 | 0 |
| DB queries per sitemap request | 0 | 1 |
| TMDB calls per trending sync | N/A | ~15 (admin trigger only) |
| Media page regeneration | Per deploy | Per 7 days |
| sitemap.xml regeneration | Every request | Every 6 hours |

---

## Initial Setup

1. Run `npx prisma migrate dev --name add_seo_page`
2. Deploy → go to admin panel → trigger "seed_initial" to populate first 500 pages
3. Verify `https://www.cinexp.site/sitemap.xml` shows ~504 URLs
4. GSC: resubmit sitemap
5. GSC: "Request Indexing" on top 3 pages
6. Cloudflare: Add Cache Rule `www.cinexp.site/media/*` → Cache Everything, TTL 7 days

---

## Admin Day-to-Day

- **Add homepage content** → auto-syncs to SEOPage → sitemap updates in 6h
- **Refresh trending** → Admin → "Sync Trending from TMDB" → adds new pages
- **Disable a page** → Admin → toggle → removed from sitemap
- **Sitemap** → always growing, never replacing old URLs

---

## What NOT to Do

| Don't | Why |
|---|---|
| ❌ Auto-sync trending on every deploy | Burns TMDB limits + Vercel build time |
| ❌ Delete old SEOPage entries during sync | Defeats cumulative sitemap |
| ❌ Add Vercel cron job | Burns function executions unnecessarily |
| ❌ Spam "Request Indexing" in GSC | Google penalizes this |
| ❌ Remove `dynamicParams = true` | Would 404 non-prebuilt pages |
| ❌ Use `revalidate = 0` (force-dynamic) | Regenerates on every request |

---

## Recovery Timeline

| Day | Action | Expected |
|---|---|---|
| 0 | Deploy all fixes | Code deployed |
| 1 | DB migration + seed + submit sitemap | ~504 URLs in sitemap |
| 1 | Next deploy | All 500+ pages prebuilt, served from CDN, 0 ISR cost per crawl |
| 3-7 | Monitor GSC Coverage | "Crawled - not indexed" drops |
| 7-14 | Monitor GSC Performance | Impressions recover |
| 14-21 | Sync Trending to grow library | Sitemap grows beyond 500 |
