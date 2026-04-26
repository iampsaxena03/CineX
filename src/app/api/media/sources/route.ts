import { NextRequest, NextResponse } from "next/server";

const HF_URL = 'https://cinexp-cinexp-scraper.hf.space/api/scrape';

async function searchMovies(title: string, year: string, type: 'movie' | 'tv' = 'movie', domain: string = 'moviesmod.farm', season?: string) {
    const res = await fetch(HF_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'searchMovies', title, year, type, domain, season }) });
    const data = await res.json();
    return data.result;
}

async function extractShortlinks(postUrl: string, type: 'movie' | 'tv' = 'movie', targetSeason?: number) {
    const res = await fetch(HF_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'extractShortlinks', postUrl, type, targetSeason }) });
    const data = await res.json();
    return data.result || [];
}

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const title = searchParams.get('title');
    const year = searchParams.get('year') || "";
    const type = searchParams.get('type') || "movie"; // "movie" or "tv"
    const industry = searchParams.get('industry') || "hollywood"; // "bollywood" or "hollywood"
    const quality = searchParams.get('quality') || "1080p";
    const season = searchParams.get('season') || undefined;
    const seasons = searchParams.get('seasons') || undefined;

    if (!title) {
        return NextResponse.json({ error: "Missing title parameter" }, { status: 400 });
    }

    try {
        const targetDomain = industry.toLowerCase() === 'bollywood' ? 'moviesleech.link' : 'moviesmod.farm';

        console.log(`[CineXP Pipeline] Starting search for ${title} ${year} on ${targetDomain}`);
        
        let allLinks: any[] = [];
        
        if (type === 'tv' && seasons) {
            // seasons can be "1:2018,2:2020,3:2024" (season:year pairs) or just "1,2,3"
            const seasonEntries = seasons.split(',').map(entry => {
                if (entry.includes(':')) {
                    const [s, y] = entry.split(':');
                    return { season: s, year: y };
                }
                return { season: entry, year };
            });
            console.log(`[CineXP Pipeline] Scraping multiple seasons:`, seasonEntries.map(e => `S${e.season}(${e.year})`).join(', '));
            
            if (targetDomain === 'moviesmod.farm') {
                // Moviesmod: ALL seasons are on ONE page. Search once, extract per-season with targetSeason filter.
                let postUrl = await searchMovies(title, year, 'tv', 'moviesmod.farm');
                if (!postUrl) {
                    // Fallback: try moviesleech per-season if moviesmod search fails entirely
                    console.log(`[CineXP Pipeline] Moviesmod search failed, falling back to moviesleech per-season...`);
                    const results = await Promise.all(seasonEntries.map(async ({ season: s, year: seasonYear }) => {
                        const leechUrl = await searchMovies(title, seasonYear, 'tv', 'moviesleech.link', s);
                        if (leechUrl) return processPost(leechUrl, 'tv', title, Number(s));
                        return [];
                    }));
                    allLinks = results.flat();
                } else {
                    // Found the multi-season page — extract each season's links from the same page
                    const results = await Promise.all(seasonEntries.map(async ({ season: s }) => {
                        return processPost(postUrl!, 'tv', title, Number(s));
                    }));
                    allLinks = results.flat();
                }
            } else {
                // MoviesLeech: each season has its OWN page with a unique URL. Search per-season.
                const results = await Promise.all(seasonEntries.map(async ({ season: s, year: seasonYear }) => {
                    let postUrl = await searchMovies(title, seasonYear, type as any, targetDomain, s);
                    if (!postUrl) {
                        const altDomain = 'moviesmod.farm';
                        postUrl = await searchMovies(title, seasonYear, type as any, altDomain, s);
                    }
                    if (postUrl) {
                        return processPost(postUrl, type as any, title, Number(s));
                    }
                    return [];
                }));
                allLinks = results.flat();
            }
        } else {
            let postUrl = await searchMovies(title, year, type as any, targetDomain, season);

            if (!postUrl) {
                // Fallback: If Hollywood fails, try Bollywood domain just in case (or vice versa)
                console.log(`[CineXP Pipeline] Search failed on ${targetDomain}. Trying alternative...`);
                const altDomain = targetDomain === 'moviesmod.farm' ? 'moviesleech.link' : 'moviesmod.farm';
                postUrl = await searchMovies(title, year, type as any, altDomain, season);
            }
            if (postUrl) {
                allLinks = await processPost(postUrl, type as any, title, season ? Number(season) : undefined);
            }
        }

        if (allLinks.length === 0) {
            return NextResponse.json({ error: "Cloudflare protection or Source not found on target domains." }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            links: allLinks
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
    }
}

async function processPost(postUrl: string, type: 'movie' | 'tv', movieTitle: string, season?: number) {
    console.log(`[CineXP Pipeline] Post URL found: ${postUrl}. Extracting shortlinks...`);
    const shortLinks = await extractShortlinks(postUrl, type, season);
    
    if (shortLinks.length === 0) {
        return [];
    }

    // Instead of bypassing modpro multiple times at once causing the server to stall and hit rate limits,
    // we return the shortlinks dynamically to the frontend so the user can see them instantly.
    // The actual bypass will occur specifically for the chosen link via a dedicated resolver route natively.
    const safeTitleBase = movieTitle.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-');
    return shortLinks.map(link => {
        const cleanLabel = link.label.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
        const finalFilename = `${safeTitleBase}-${cleanLabel}_CineXP.mkv`;
        return {
            label: link.label,
            // The URL directly triggers the resolver logic.
            proxyDownloadUrl: `/api/media/resolve?url=${encodeURIComponent(link.url)}&filename=${encodeURIComponent(finalFilename)}`,
            season: season
        };
    });
}
