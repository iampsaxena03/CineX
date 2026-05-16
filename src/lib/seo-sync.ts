import { prisma } from '@/lib/admin';
import { getMediaById, getPopularMovies, getPopularTVShows, getTrending, type TMDBMediaItem } from '@/lib/tmdb';
import { generateSlug } from '@/lib/utils';

const SEO_PAGE_TARGET = 500;

export async function syncHomepageToSEOPages(): Promise<number> {
  const homeItems = await prisma.homeSectionItem.findMany({
    include: { section: true },
  });

  let added = 0;
  for (const item of homeItems) {
    const exists = await prisma.sEOPage.findUnique({
      where: { tmdbId_mediaType: { tmdbId: item.tmdbId, mediaType: item.mediaType } }
    });
    if (exists) continue;

    const details = await getMediaById(item.tmdbId, item.mediaType);
    if (!details) continue;

    const title = (details as any).title || (details as any).name;
    const slug = generateSlug(item.tmdbId, title);

    await prisma.sEOPage.create({
      data: { tmdbId: item.tmdbId, mediaType: item.mediaType, title, slug, source: 'homepage' }
    });
    added++;
  }
  return added;
}

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
  return { added: totalAdded, total: existingCount + totalAdded, indian: indianAdded, foreign: foreignAdded, other: otherAdded };
}

async function fetchIndianTMDBContent(): Promise<TMDBMediaItem[]> {
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
    } catch (_e) { /* duplicate — skip */ }
  }
  return added;
}

export type SEOPageRow = {
  id: string;
  tmdbId: number;
  mediaType: string;
  title: string;
  slug: string;
  source: string;
  enabled: boolean;
  addedAt: Date;
};

export async function getSEOPagesForSitemap(): Promise<SEOPageRow[]> {
  return prisma.sEOPage.findMany({
    where: { enabled: true },
    orderBy: [{ source: 'asc' }, { addedAt: 'desc' }],
  });
}
