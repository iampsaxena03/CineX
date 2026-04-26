import { NextRequest, NextResponse } from 'next/server';

const HF_URL = 'https://cinexp-cinexp-scraper.hf.space/api/scrape';

async function bypassModpro(shortUrl: string) {
    const res = await fetch(HF_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bypassModpro', shortUrl }) });
    if (!res.ok) {
        const errText = await res.text();
        console.error(`[HF Bypass] HF returned ${res.status}: ${errText}`);
        throw new Error(`HF scraper error (${res.status}): ${errText}`);
    }
    const data = await res.json();
    console.log(`[HF Bypass] Response:`, JSON.stringify(data));
    return data.result;
}

async function extractDriveSeed(driveseedUrl: string) {
    const res = await fetch(HF_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'extractDriveSeed', driveseedUrl }) });
    if (!res.ok) {
        const errText = await res.text();
        console.error(`[HF DriveSeed] HF returned ${res.status}: ${errText}`);
        throw new Error(`HF scraper error (${res.status}): ${errText}`);
    }
    const data = await res.json();
    console.log(`[HF DriveSeed] Response:`, JSON.stringify(data));
    return data.result;
}

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');
    const filename = req.nextUrl.searchParams.get('filename') || 'CineXP-Download.mkv';

    if (!url) {
        return NextResponse.json({ error: "No URL parameter provided" }, { status: 400 });
    }

    try {
        console.log(`[CineXP Resolver] Starting On-Demand Bypass via HuggingFace for: ${url}`);
        
        // 1. Bypass the Modpro Timer (via HuggingFace)
        const driveSeedUrl = await bypassModpro(url);
        if (!driveSeedUrl) {
            return NextResponse.json({ error: "Bypass returned null — HuggingFace scraper could not extract the final URL. The source site may have changed its protection." }, { status: 400 });
        }

        // 2. Extract final DriveSeed location (via HuggingFace)
        console.log(`[CineXP Resolver] Resolving Driveseed via HF: ${driveSeedUrl}`);
        const finalStreamUrl = await extractDriveSeed(driveSeedUrl);
        if (!finalStreamUrl) {
            return NextResponse.json({ error: "Failed to resolve final stream from DriveSeed." }, { status: 502 });
        }

        // 3. Return a 302 Redirect directly to the Upstream Google CDN.
        console.log(`[CineXP Resolver] Success! Executing strict off-load to Google CDN.`);
        return NextResponse.redirect(finalStreamUrl);

    } catch (err: any) {
        console.error(`[CineXP Resolver] Error:`, err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
