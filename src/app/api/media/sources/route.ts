import { NextRequest, NextResponse } from "next/server";
import { searchMovies, extractShortlinks, bypassModpro, extractDriveSeed } from "@/lib/scraper";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const title = searchParams.get('title');
    const year = searchParams.get('year') || "";
    const type = searchParams.get('type') || "movie"; // "movie" or "tv"
    const industry = searchParams.get('industry') || "hollywood"; // "bollywood" or "hollywood"
    const quality = searchParams.get('quality') || "1080p";

    if (!title) {
        return NextResponse.json({ error: "Missing title parameter" }, { status: 400 });
    }

    try {
        const targetDomain = industry.toLowerCase() === 'bollywood' ? 'moviesleech.link' : 'moviesmod.farm';

        console.log(`[CineXP Pipeline] Starting search for ${title} ${year} on ${targetDomain}`);
        const postUrl = await searchMovies(title, year, type as any, targetDomain);

        if (!postUrl) {
            // Fallback: If Hollywood fails, try Bollywood domain just in case (or vice versa)
            console.log(`[CineXP Pipeline] Search failed on ${targetDomain}. Trying alternative...`);
            const altDomain = targetDomain === 'moviesmod.farm' ? 'moviesleech.link' : 'moviesmod.farm';
            const altPostUrl = await searchMovies(title, year, type as any, altDomain);
            if (!altPostUrl) {
                return NextResponse.json({ error: "Cloudflare protection or Source not found on target domains." }, { status: 404 });
            }
            return processPost(altPostUrl, type as any, title);
        }

        return processPost(postUrl, type as any, title);

    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
    }
}

async function processPost(postUrl: string, type: 'movie' | 'tv', movieTitle: string) {
    console.log(`[CineXP Pipeline] Post URL found: ${postUrl}. Extracting shortlinks...`);
    const shortLinks = await extractShortlinks(postUrl, type);
    
    if (shortLinks.length === 0) {
        return NextResponse.json({ error: "Could not find any matched download links." }, { status: 404 });
    }

    // Instead of bypassing modpro multiple times at once causing the server to stall and hit rate limits,
    // we return the shortlinks dynamically to the frontend so the user can see them instantly.
    // The actual bypass will occur specifically for the chosen link via a dedicated resolver route natively.
    const safeTitleBase = movieTitle.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-');
    const proxyLinks = shortLinks.map(link => {
        const cleanLabel = link.label.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
        const finalFilename = `${safeTitleBase}-${cleanLabel}_CineXP.mkv`;
        return {
            label: link.label,
            // The URL directly triggers the resolver logic.
            proxyDownloadUrl: `/api/media/resolve?url=${encodeURIComponent(link.url)}&filename=${encodeURIComponent(finalFilename)}`
        };
    });

    return NextResponse.json({
        success: true,
        source: postUrl,
        links: proxyLinks
    });
}
