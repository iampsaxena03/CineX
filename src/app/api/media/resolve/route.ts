import { NextRequest, NextResponse } from 'next/server';
import { bypassModpro, extractDriveSeed } from '@/lib/scraper';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');
    const filename = req.nextUrl.searchParams.get('filename') || 'CineXP-Download.mkv';

    if (!url) {
        return NextResponse.json({ error: "No URL parameter provided" }, { status: 400 });
    }

    try {
        console.log(`[CineXP Resolver] Starting On-Demand Bypass for: ${url}`);
        
        // 1. Bypass the Modpro Timer
        const driveSeedUrl = await bypassModpro(url);
        if (!driveSeedUrl) {
            return NextResponse.json({ error: "Failed to bypass Modpro. Vercel Datacenter IP is likely blocked by their Cloudflare." }, { status: 400 });
        }

        // 2. Extract final DriveSeed location
        console.log(`[CineXP Resolver] Resolving Driveseed: ${driveSeedUrl}`);
        const finalStreamUrl = await extractDriveSeed(driveSeedUrl);
        if (!finalStreamUrl) {
            return NextResponse.json({ error: "Failed to resolve final stream from DriveSeed." }, { status: 502 });
        }

        // 3. Return a 302 Redirect directly to the Upstream Google CDN.
        // Serverless (Vercel) cannot proxy 2GB file payloads continuously; it forcefully severs them after 30s causing 502s.
        console.log(`[CineXP Resolver] Success! Executing strict off-load to Google CDN.`);
        return NextResponse.redirect(finalStreamUrl);

    } catch (err: any) {
        console.error(`[CineXP Resolver] Error:`, err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
