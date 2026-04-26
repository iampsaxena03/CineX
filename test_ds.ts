import * as cheerio from 'cheerio';

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.112 Safari/537.36";

export async function extractDriveSeed(driveseedUrl: string) {
    console.log(`[Scraper] Extracting Driveseed Final Link: ${driveseedUrl}`);
    try {
        const res = await fetch(driveseedUrl, { headers: { 'User-Agent': USER_AGENT } });
        const html = await res.text();
        const $ = cheerio.load(html);
        
        let finalCdnLink: string | null = null;
        let zfileLink: string | null = null;
        
        $('a').each((_, el) => {
            const text = $(el).text().toLowerCase();
            const href = $(el).attr('href');
            if (href) {
                if (text.includes('instant download') || text.includes('resume download') || text.includes('download')) {
                    if ((href.includes('cdn.') || href.startsWith('http')) && !href.includes('driveseed.')) { 
                        finalCdnLink = href;
                    }
                }
                if (href.includes('/zfile/')) {
                    zfileLink = href;
                }
            }
        });

        console.log({finalCdnLink, zfileLink});

        if (!finalCdnLink && zfileLink) {
             const zUrl = zfileLink.startsWith('http') ? zfileLink : new URL(zfileLink, driveseedUrl).toString();
             console.log(`[Scraper] Following zfile link: ${zUrl}`);
             const zRes = await fetch(zUrl, { headers: { 'User-Agent': USER_AGENT } });
             const zHtml = await zRes.text();
             const $z = cheerio.load(zHtml);
             
             $z('a').each((_, el) => {
                 const text = $z(el).text().toLowerCase();
                 const href = $z(el).attr('href');
                 if (href && (text.includes('resume') || text.includes('download'))) {
                     if (href.startsWith('http') && !href.includes('driveseed.')) {
                         finalCdnLink = href;
                     }
                 }
             });
        }
        
        console.log({finalCdnLink});
        if (!finalCdnLink) return null;

        const redirRes = await fetch(finalCdnLink, { 
            headers: { 'User-Agent': USER_AGENT },
            redirect: 'manual' 
        });
        
        const location = redirRes.headers.get('location');
        if (location && location.includes('?url=')) {
            const finalUrlParams = new URL(location).searchParams;
            return finalUrlParams.get('url') || location;
        }

        return finalCdnLink;
    } catch(e) {
         console.error(`[Scraper] Driveseed Extractor Error:`, e);
         return null;
    }
}

extractDriveSeed('https://driveseed.org/file/hwFywzECHyZ0soj73J9c').then(console.log);
