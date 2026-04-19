import * as cheerio from 'cheerio';

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.112 Safari/537.36";

export async function searchMovies(title: string, year: string, type: 'movie' | 'tv' = 'movie', domain: string = 'moviesmod.farm') {
  const searchQuery = type === 'tv' ? title : `${title} ${year}`;
  const query = encodeURIComponent(searchQuery.trim());
  const url = `https://${domain}/?s=${query}`;
  
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // Most wordpress themes use article or .post
    // Let's grab the first article link
    // Moviesmod often uses .post-title a or .title a
    const firstResult = $('article').first().find('a').attr('href') || $('.post-title a').first().attr('href') || $('h2.title a').first().attr('href');
    
    if (!firstResult) {
      console.log(`[Scraper] No results found on ${domain} for ${query}`);
      return null;
    }
    return firstResult;
  } catch (err) {
    console.error(`[Scraper] Search Error:`, err);
    return null;
  }
}

export async function extractShortlinks(postUrl: string, type: 'movie' | 'tv' = 'movie') {
  try {
    const res = await fetch(postUrl, { headers: { 'User-Agent': USER_AGENT } });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const possibleLinks: { url: string; label: string }[] = [];
    
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && (href.includes('modpro.blog') || href.includes('leechpro.blog') || href.includes('modpro'))) {
        const text = $(el).text().trim() || "Download";
        let pre1 = $(el).parent().prev().text().trim();
        let pre2 = $(el).parent().prev().prev().text().trim();
        let pre3 = $(el).parent().prev().prev().prev().text().trim();
        
        let contextText = (text + " " + pre1 + " " + pre2 + " " + pre3).toLowerCase();

        // Construct an authentic label from the exact lines above the link
        let rawLabel = (pre1.length > 5 && pre1.length < 100) ? pre1 : 
                       (pre2.length > 5 && pre2.length < 100) ? pre2 : "Download Link";
                       
        // If the text above is just a generic 'Download Links', go one level higher
        if (rawLabel.toLowerCase().includes('download link') && pre2 && pre2.length > 5) {
            rawLabel = pre2;
        }

        // Clean up the label
        let label = rawLabel.replace(/^Download\s*/i, '').replace(/Links?$/i, '').trim() || "Premium Node";
        
        // Strip out the movie title and year if present, keeping only the technical details (e.g., '1080p 10bit x265')
        if (type === 'movie') {
            const qualityMatch = label.match(/(480p|720p|1080p|2160p|4k).*$/i);
            if (qualityMatch) {
                label = qualityMatch[0].trim();
            }
            // Strip out random trailing brackets
            label = label.replace(/\[.*?\]$/, '').trim();
        }
        
        if (type === 'tv') {
             const isSeasonPack = contextText.includes('season') || contextText.includes('zip') || contextText.includes('batch') || contextText.includes('pack') || contextText.includes('complete');
             const episodeRegex = /(episode|ep\s*\d+|s\d{1,2}e\d{1,3}|\be\d{1,3}\b)/i;
             const explicitlyEpisode = episodeRegex.test(text) || episodeRegex.test(pre1);
             const immediatePack = /(zip|pack|batch|season|complete)/i.test(text) || /(zip|pack|batch|season|complete)/i.test(pre1);
             
             // Strict Season-only filter based on DOM paragraph context above the button
             if (!isSeasonPack || (explicitlyEpisode && !immediatePack)) {
                 return;
             }
             
             // Prepend season identifier if not already in the label but found in context
             if (!label.toLowerCase().includes('season')) {
                 const sm = contextText.match(/season\s*(\d+)/i) || contextText.match(/s(\d{2})/i);
                 if (sm && sm[1]) {
                     label = `Season ${parseInt(sm[1])} - ${label}`;
                 }
             }

             // TV SHOW DEDUPLICATION: The user requested ONLY one link per season quality combo.
             // If we already have this exact quality label, discard any extra duplicate links.
             if (!possibleLinks.find(l => l.label === label)) {
                  possibleLinks.push({ url: href.replace(/#clickimage$/, ''), label });
             }
        } else {
            // MOVIE DEDUPLICATION: Preserve mirrors by appending (Alt X) if label matches but URL differs
            if (!possibleLinks.find(l => l.url === href.replace(/#clickimage$/, ''))) {
                const dupCount = possibleLinks.filter(l => l.label.includes(label)).length;
                const finalLabel = dupCount > 0 ? `${label} (Alt ${dupCount + 1})` : label;
                possibleLinks.push({ url: href.replace(/#clickimage$/, ''), label: finalLabel });
            }
        }
      }
    });

    return possibleLinks;

  } catch(e) {
    console.error(`[Scraper] Quality Extractor Error:`, e);
    return [];
  }
}

export async function bypassModpro(shortUrl: string) {
    const defaultHeaders = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    };

    console.log(`[Scraper] Bypassing Shortlink: ${shortUrl}`);

    try {
        let r1 = await fetch(shortUrl, { method: 'POST', headers: defaultHeaders });
        let html1 = await r1.text();
        let $ = cheerio.load(html1);

        // Check for Fast Server Button
        const fastSrvBtn = $('a.maxbutton-fast-server-gdrive').attr('href');
        if (fastSrvBtn) {
            r1 = await fetch(fastSrvBtn, { method: 'POST', headers: defaultHeaders });
            html1 = await r1.text();
            $ = cheerio.load(html1);
        }

        const wpHttpInput = $('input[name="_wp_http"]').attr('value');
        if (!wpHttpInput) {
            throw new Error("Could not find _wp_http token.");
        }

        let formAction = $('form').attr('action');
        if (!formAction) throw new Error("Could not find form action.");

        if (!formAction.startsWith('http')) {
            const urlObj = new URL(shortUrl);
            formAction = `${urlObj.origin}${formAction.startsWith('/') ? '' : '/'}${formAction}`;
        }

        const timerHost = new URL(formAction).host;
        const timerOrigin = new URL(formAction).origin;

        const postHeaders = {
            ...defaultHeaders,
            "Host": timerHost,
            "Content-Type": "application/x-www-form-urlencoded",
            "Origin": timerOrigin,
            "Referer": shortUrl
        };

        const data1 = new URLSearchParams();
        data1.append('_wp_http', wpHttpInput);

        const r2 = await fetch(formAction, {
            method: 'POST',
            headers: postHeaders,
            body: data1.toString()
        });
        const html2 = await r2.text();
        const $2 = cheerio.load(html2);

        let action2 = $2('form').attr('action');
        if (!action2) throw new Error("No second form found");
        if (!action2.startsWith('http')) action2 = timerOrigin + action2;

        const wpHttp2Input = $2('input[name="_wp_http2"]').attr('value');
        const tokenInput = $2('input[name="token"]').attr('value');

        if (!wpHttp2Input || !tokenInput) throw new Error("Missing second _wp_http2 or token");

        const data2 = new URLSearchParams();
        data2.append('_wp_http2', wpHttp2Input);
        data2.append('token', tokenInput);

        const r3 = await fetch(action2, {
            method: 'POST',
            headers: postHeaders,
            body: data2.toString()
        });
        const html3 = await r3.text();

        const match1 = html3.match(/pepe-[a-zA-Z\d]+/);
        const match2 = html3.match(/'eJ(.*?)',\s*\d+\)/);

        if (match1 && match2) {
            const pepeNumber = match1[0];
            const pepeVal = `eJ${match2[1]}`;
            const verifyUrl = `${timerOrigin}/?go=${pepeNumber}`;
            const cookieName = verifyUrl.replace(/^.*?pepe-/, 'pepe-');

            const cookieHeaders = {
                ...defaultHeaders,
                "Cookie": `${cookieName}=${pepeVal}`
            };

            const r4 = await fetch(verifyUrl, { headers: cookieHeaders });
            const html4 = await r4.text();
            
            const metaRefresh = cheerio.load(html4)('meta[http-equiv="refresh"]').attr('content');
            if (metaRefresh) {
                const redirectUrl = metaRefresh.split('url=')[1];
                const modi5Base = redirectUrl.substring(0, redirectUrl.indexOf('/r?'));

                const r5 = await fetch(redirectUrl, { headers: defaultHeaders });
                const html5 = await r5.text();

                const finalMatch = html5.match(/window\.location\.replace\("([^"]+)"\)/);
                if (finalMatch) {
                    return `${modi5Base}${finalMatch[1]}`;
                }
            }
        }
        
        throw new Error("Could not extract final url from pepe tokens");

    } catch (e) {
        console.error(`[Scraper] Bypass Error:`, e);
        return null;
    }
}

export async function extractDriveSeed(driveseedUrl: string) {
    console.log(`[Scraper] Extracting Driveseed Final Link: ${driveseedUrl}`);
    try {
        const res = await fetch(driveseedUrl, { headers: { 'User-Agent': USER_AGENT } });
        const html = await res.text();
        const $ = cheerio.load(html);
        
        // Find Instant Download or Resume Download
        let finalCdnLink: string | null = null;
        
        $('a').each((_, el) => {
            const text = $(el).text().toLowerCase();
            if (text.includes('instant download') || text.includes('resume download') || text.includes('download')) {
                const href = $(el).attr('href');
                if (href && (href.includes('cdn.') || href.startsWith('http')) && !href.includes('driveseed.')) { 
                    finalCdnLink = href;
                }
            }
        });
        
        if (!finalCdnLink) return null;

        // DriveSeed CDNs now issue a 302 Found redirect to their VideoSeed player.
        // The real Google stream url is embedded in the `?url=` parameter of the Location header.
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
