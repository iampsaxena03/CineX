import { MetadataRoute } from 'next';
import { getTrending } from '@/lib/tmdb';
import { generateSlug } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://cinexp.site';

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/movies`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tv`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/trending`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  try {
    const trending = await getTrending();
    
    const trendingRoutes: MetadataRoute.Sitemap = trending.map((item) => {
      const title = (item as any).title || (item as any).name;
      return {
        url: `${baseUrl}/media/${item.media_type || 'movie'}/${generateSlug(item.id, title)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      };
    });

    return [...staticRoutes, ...trendingRoutes];
  } catch (error) {
    console.error("Failed to generate trending sitemap routes", error);
    return staticRoutes; // Fallback to basic static routes
  }
}
