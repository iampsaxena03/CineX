import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://cinexp.site';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/admin-login/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
