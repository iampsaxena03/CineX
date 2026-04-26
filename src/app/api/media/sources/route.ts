import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const scraperApiUrl = process.env.SCRAPER_API_URL;
    const scraperSecret = process.env.SCRAPER_SECRET || '';

    if (!scraperApiUrl) {
        return NextResponse.json({ error: "SCRAPER_API_URL is not configured in environment variables" }, { status: 500 });
    }

    try {
        console.log(`[CineXP Proxy] Forwarding search request to Hugging Face Scraper API...`);
        
        // Pass all query parameters to the scraper API (/scrape)
        const url = new URL(`${scraperApiUrl}/scrape`);
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

        return NextResponse.json(data);
    } catch (e: any) {
        console.error('[CineXP Proxy Error]', e);
        return NextResponse.json({ error: e.message || "Internal server error connecting to external scraper API" }, { status: 500 });
    }
}
