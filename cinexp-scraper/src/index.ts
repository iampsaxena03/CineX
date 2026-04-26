import express from 'express';
import cors from 'cors';
import { searchMovies, extractShortlinks, bypassModpro, extractDriveSeed } from './scraper';

const app = express();
const PORT = process.env.PORT || 8000;
const SCRAPER_SECRET = process.env.SCRAPER_SECRET || '';

// Middleware
app.use(cors());
app.use(express.json());

// Auth middleware — protects all scraper endpoints
function authGuard(req: express.Request, res: express.Response, next: express.NextFunction): void {
    if (!SCRAPER_SECRET) {
        // No secret configured — allow all (dev mode)
        next();
        return;
    }
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${SCRAPER_SECRET}`) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    next();
}

// ============================================================
// Health Check (public — used by UptimeRobot to keep alive)
// ============================================================
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', message: 'CineXP Scraper API is running', uptime: process.uptime() });
});

// ============================================================
// /scrape — Main scraping endpoint (replaces /api/media/sources)
// ============================================================
app.get('/scrape', authGuard, async (req, res) => {
    const title = req.query.title as string;
    const year = (req.query.year as string) || '';
    const type = (req.query.type as string) || 'movie';
    const industry = (req.query.industry as string) || 'hollywood';
    const season = req.query.season as string | undefined;
    const seasons = req.query.seasons as string | undefined;

    if (!title) {
        res.status(400).json({ error: 'Missing title parameter' });
        return;
    }

    try {
        const targetDomain = industry.toLowerCase() === 'bollywood' ? 'moviesleech.link' : 'moviesmod.farm';
        console.log(`[CineXP Pipeline] Starting search for ${title} ${year} on ${targetDomain}`);

        let allLinks: any[] = [];

        if (type === 'tv' && seasons) {
            // Parse season:year pairs
            const seasonEntries = seasons.split(',').map(entry => {
                if (entry.includes(':')) {
                    const [s, y] = entry.split(':');
                    return { season: s, year: y };
                }
                return { season: entry, year };
            });
            console.log(`[CineXP Pipeline] Scraping multiple seasons:`, seasonEntries.map(e => `S${e.season}(${e.year})`).join(', '));

            if (targetDomain === 'moviesmod.farm') {
                // Moviesmod: ALL seasons are on ONE page. Search once, extract per-season.
                let postUrl = await searchMovies(title, year, 'tv', 'moviesmod.farm');
                if (!postUrl) {
                    console.log(`[CineXP Pipeline] Moviesmod search failed, falling back to moviesleech per-season...`);
                    const results = await Promise.all(seasonEntries.map(async ({ season: s, year: seasonYear }) => {
                        const leechUrl = await searchMovies(title, seasonYear, 'tv', 'moviesleech.link', s);
                        if (leechUrl) return processPost(leechUrl, 'tv', title, Number(s));
                        return [];
                    }));
                    allLinks = results.flat();
                } else {
                    const results = await Promise.all(seasonEntries.map(async ({ season: s }) => {
                        return processPost(postUrl!, 'tv', title, Number(s));
                    }));
                    allLinks = results.flat();
                }
            } else {
                // MoviesLeech: each season has its OWN page. Search per-season.
                const results = await Promise.all(seasonEntries.map(async ({ season: s, year: seasonYear }) => {
                    let postUrl = await searchMovies(title, seasonYear, type as any, targetDomain, s);
                    if (!postUrl) {
                        postUrl = await searchMovies(title, seasonYear, type as any, 'moviesmod.farm', s);
                    }
                    if (postUrl) return processPost(postUrl, type as any, title, Number(s));
                    return [];
                }));
                allLinks = results.flat();
            }
        } else {
            let postUrl = await searchMovies(title, year, type as any, targetDomain, season);
            if (!postUrl) {
                console.log(`[CineXP Pipeline] Search failed on ${targetDomain}. Trying alternative...`);
                const altDomain = targetDomain === 'moviesmod.farm' ? 'moviesleech.link' : 'moviesmod.farm';
                postUrl = await searchMovies(title, year, type as any, altDomain, season);
            }
            if (postUrl) {
                allLinks = await processPost(postUrl, type as any, title, season ? Number(season) : undefined);
            }
        }

        if (allLinks.length === 0) {
            res.status(404).json({ error: 'Cloudflare protection or Source not found on target domains.' });
            return;
        }

        res.json({ success: true, links: allLinks });
    } catch (e: any) {
        console.error('[CineXP Pipeline] Error:', e);
        res.status(500).json({ error: e.message || 'Internal server error' });
    }
});

// ============================================================
// /resolve — On-demand bypass (replaces /api/media/resolve)
// ============================================================
app.get('/resolve', authGuard, async (req, res) => {
    const url = req.query.url as string;
    const filename = (req.query.filename as string) || 'CineXP-Download.mkv';

    if (!url) {
        res.status(400).json({ error: 'No URL parameter provided' });
        return;
    }

    try {
        console.log(`[CineXP Resolver] Starting On-Demand Bypass for: ${url}`);

        // 1. Bypass the Modpro/Leechpro Timer
        const driveSeedUrl = await bypassModpro(url);
        if (!driveSeedUrl) {
            res.status(400).json({ error: 'Failed to bypass Modpro. IP may be blocked.' });
            return;
        }

        // 2. Extract final DriveSeed location
        console.log(`[CineXP Resolver] Resolving Driveseed: ${driveSeedUrl}`);
        const finalStreamUrl = await extractDriveSeed(driveSeedUrl);
        if (!finalStreamUrl) {
            res.status(502).json({ error: 'Failed to resolve final stream from DriveSeed.' });
            return;
        }

        // 3. Return the redirect URL (Vercel will do the actual 302)
        console.log(`[CineXP Resolver] Success! Final URL resolved.`);
        res.json({ success: true, redirectUrl: finalStreamUrl, filename });
    } catch (err: any) {
        console.error('[CineXP Resolver] Error:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

// ============================================================
// Helper: Process a post URL into download links
// ============================================================
async function processPost(postUrl: string, type: 'movie' | 'tv', movieTitle: string, season?: number) {
    console.log(`[CineXP Pipeline] Post URL found: ${postUrl}. Extracting shortlinks...`);
    const shortLinks = await extractShortlinks(postUrl, type, season);

    if (shortLinks.length === 0) return [];

    const safeTitleBase = movieTitle.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-');
    return shortLinks.map(link => {
        const cleanLabel = link.label.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
        const finalFilename = `${safeTitleBase}-${cleanLabel}_CineXP.mkv`;
        return {
            label: link.label,
            proxyDownloadUrl: `/api/media/resolve?url=${encodeURIComponent(link.url)}&filename=${encodeURIComponent(finalFilename)}`,
            season: season
        };
    });
}

// ============================================================
// Start Server
// ============================================================
app.listen(PORT, () => {
    console.log(`🚀 CineXP Scraper API running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Auth: ${SCRAPER_SECRET ? 'ENABLED' : 'DISABLED (dev mode)'}`);
});
