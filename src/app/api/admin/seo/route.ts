import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/guard';
import { syncTrendingToSEOPages, syncHomepageToSEOPages, getSEOPagesForSitemap, type SEOPageRow } from '@/lib/seo-sync';
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
