import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const streamUrl = searchParams.get('url');
    const filename = searchParams.get('filename') || 'CineXP-Movie.mkv';

    if (!streamUrl) {
        return NextResponse.json({ error: "Missing stream URL" }, { status: 400 });
    }

    try {
        const response = await fetch(streamUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            return NextResponse.json({ error: "Failed to fetch from upstream CDN" }, { status: response.status });
        }

        // We prepare our own headers based on the original response
        const headers = new Headers();
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        
        if (contentType) headers.set('Content-Type', contentType);
        if (contentLength) headers.set('Content-Length', contentLength);
        
        // This is the core trick: Overriding the content disposition to force our custom filename
        headers.set('Content-Disposition', `attachment; filename="${filename}"`);

        // We stream the exact raw bytes through our CineXP backend to the user
        return new NextResponse(response.body, {
            status: 200,
            headers
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal Streaming Error" }, { status: 500 });
    }
}
