import { MetadataRoute } from 'next';
import { getSEOPagesForSitemap, type SEOPageRow } from '@/lib/seo-sync';

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
