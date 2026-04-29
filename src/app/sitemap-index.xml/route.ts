export async function GET() {
  const baseUrl = 'https://www.cinexp.site';
  
  // We have 10 paginated sitemaps (0.xml through 9.xml) from generateSitemaps
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  for (let i = 0; i < 10; i++) {
    xml += '  <sitemap>\n';
    xml += `    <loc>${baseUrl}/sitemap/${i}.xml</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
    xml += '  </sitemap>\n';
  }
  
  xml += '</sitemapindex>';
  
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400'
    }
  });
}
