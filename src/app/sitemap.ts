import { MetadataRoute } from 'next';
import { getSEOPrebuildData } from '@/lib/tmdb';
import { generateSlug } from "@/lib/utils";

export const revalidate = 86400; // Cache sitemap for 24 hours

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
    const prebuildData = await getSEOPrebuildData();
    
    const dynamicRoutes: MetadataRoute.Sitemap = prebuildData.map(({ type, item }) => {
      const title = (item as any).title || (item as any).name;
      return {
        url: `${baseUrl}/media/${type}/${generateSlug(item.id, title)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      };
    });

    return [...staticRoutes, ...dynamicRoutes];
  } catch (error) {
    console.error("Failed to generate dynamic sitemap routes", error);
    return staticRoutes; // Fallback to basic static routes
  }
}
