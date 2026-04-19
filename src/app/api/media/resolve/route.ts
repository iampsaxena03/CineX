import { NextRequest, NextResponse } from 'next/server';
import { bypassModpro, extractDriveSeed } from '@/lib/scraper';

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
            return NextResponse.json({ error: "Failed to bypass Modpro cyberlocker explicitly." }, { status: 502 });
        }

        // 2. Extract final DriveSeed location
        console.log(`[CineXP Resolver] Resolving Driveseed: ${driveSeedUrl}`);
        const finalStreamUrl = await extractDriveSeed(driveSeedUrl);
        if (!finalStreamUrl) {
            return NextResponse.json({ error: "Failed to resolve final stream from DriveSeed." }, { status: 502 });
        }

        // 3. Return a 302 Redirect to our internal Download Proxy with the real stream.
        const downloadProxyUrl = `/api/media/download?url=${encodeURIComponent(finalStreamUrl)}&filename=${encodeURIComponent(filename)}`;
        
        const protocol = req.headers.get('x-forwarded-proto') || 'http';
        let host = req.headers.get('host') || 'localhost:3000';
        // Fix for Windows Chrome ERR_ADDRESS_INVALID when bound to 0.0.0.0
        if (host.includes('0.0.0.0')) host = host.replace('0.0.0.0', 'localhost');
        const baseUrl = `${protocol}://${host}`;

        console.log(`[CineXP Resolver] Success! Redirecting to internal streaming proxy.`);
        return NextResponse.redirect(new URL(downloadProxyUrl, baseUrl));

    } catch (err: any) {
        console.error(`[CineXP Resolver] Error:`, err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
