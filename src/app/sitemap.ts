import { MetadataRoute } from 'next';
import { getTrending, getUpcomingMovies } from '@/lib/tmdb';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cinexp.vercel.app';

  // Base static routes
  const routes = [
    '',
    '/movies',
    '/tv',
    '/trending',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  try {
    // Fetch some dynamic routes for immediate indexing
    const [trending, upcoming] = await Promise.all([
      getTrending('US'),
      getUpcomingMovies('US')
    ]);

    const dynamicRoutes = [...trending, ...upcoming]
      .filter((item, index, self) => self.findIndex(t => t.id === item.id) === index) // deduplicate
      .slice(0, 100) // Keep sitemap size reasonable
      .map((item) => ({
        url: `${baseUrl}/media/${item.media_type || 'movie'}/${item.id}`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));

    return [...routes, ...dynamicRoutes];
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return routes;
  }
}
