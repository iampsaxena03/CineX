import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const streamUrl = searchParams.get('url');
    const filename = searchParams.get('filename') || 'CineXP-Movie.mkv';

    if (!streamUrl) {
        return NextResponse.json({ error: "Missing stream URL" }, { status: 400 });
    }

    try {
        // Redirect directly to the stream URL instead of proxying GBs of data through Vercel
        return NextResponse.redirect(streamUrl);
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal Redirect Error" }, { status: 500 });
    }
}
