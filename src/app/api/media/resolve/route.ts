import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const scraperApiUrl = process.env.SCRAPER_API_URL;
    const scraperSecret = process.env.SCRAPER_SECRET || '';

    if (!scraperApiUrl) {
        return NextResponse.json({ error: "SCRAPER_API_URL is not configured in environment variables" }, { status: 500 });
    }

    try {
        console.log(`[CineXP Resolver Proxy] Forwarding resolve request to Hugging Face Scraper API...`);
        
        // Pass all query parameters to the scraper API (/resolve)
        const url = new URL(`${scraperApiUrl}/resolve`);
        searchParams.forEach((value, key) => {
            url.searchParams.append(key, value);
        });

        const res = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${scraperSecret}`
            }
        });

        const data = await res.json();
        
        if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
        }

        // The external scraper API resolves the bypass and returns the final upstream CDN URL.
        // Vercel (Edge) will perform the final HTTP 302 Redirect to the Google CDN here.
        if (data.redirectUrl) {
            console.log(`[CineXP Resolver Proxy] Success! Executing strict off-load redirect to CDN.`);
            return NextResponse.redirect(data.redirectUrl);
        }

        return NextResponse.json({ error: "No redirect URL found from upstream resolver" }, { status: 500 });
    } catch (err: any) {
        console.error(`[CineXP Resolver Proxy Error]`, err);
        return NextResponse.json({ error: err.message || "Internal server error connecting to external scraper API" }, { status: 500 });
    }
}
