import { MetadataRoute } from 'next';
import { getDeepCatalogData } from '@/lib/tmdb';
import { generateSlug } from "@/lib/utils";

export const revalidate = 86400; // Cache sitemap for 24 hours

export async function generateSitemaps() {
  // Generate 10 sitemap bundles (id 0 to 9)
  // ID 0-4 = Movies (Pages 1-125)
  // ID 5-9 = TV Shows (Pages 1-125)
  return [
    { id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 },
    { id: 5 }, { id: 6 }, { id: 7 }, { id: 8 }, { id: 9 }
  ];
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
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
    let type: 'movie' | 'tv' = 'movie';
    let startPage = 1;

    // Calculate TMDB bounds for the specific sitemap chunk
    if (id < 5) {
      type = 'movie';
      startPage = 1 + (id * 25);
    } else {
      type = 'tv';
      startPage = 1 + ((id - 5) * 25);
    }

    const endPage = startPage + 24; // 25 pages * 20 items = 500 URLs per sub-sitemap
    
    // Fetch deep catalog directly bypassing the prebuild limits
    const catalogData = await getDeepCatalogData(type, startPage, endPage);
    
    const dynamicRoutes: MetadataRoute.Sitemap = catalogData.map((item) => {
      const title = (item as any).title || (item as any).name;
      return {
        url: `${baseUrl}/media/${type}/${generateSlug(item.id, title)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      };
    });

    // Only inject static generic routes into the very first sitemap file
    if (id === 0) {
      return [...staticRoutes, ...dynamicRoutes];
    }
    
    return dynamicRoutes;
  } catch (error) {
    console.error(`Failed to generate sitemap batch ${id}`, error);
    return id === 0 ? staticRoutes : [];
  }
}
