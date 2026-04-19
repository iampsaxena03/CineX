import { NextResponse } from 'next/server'

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const downloadUrl = searchParams.get('url')
  const filename = searchParams.get('filename') || 'video.mp4'

  if (!downloadUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  const decodedUrl = decodeURIComponent(downloadUrl)
  if (!decodedUrl.startsWith('https://bcdnxw.hakunaymatata.com/') && !decodedUrl.startsWith('https://valiw.hakunaymatata.com/')) {
     return NextResponse.json({ error: 'Invalid proxy target' }, { status: 403 })
  }

  try {
    const reqHeaders = new Headers()
    reqHeaders.set('User-Agent', 'okhttp/4.12.0')
    reqHeaders.set('Referer', 'https://fmoviesunblocked.net/')
    reqHeaders.set('Origin', 'https://fmoviesunblocked.net')

    // Pass through the Range header crucial for seeking backwards/forwards in video
    if (request.headers.has('range')) {
      reqHeaders.set('Range', request.headers.get('range')!)
    }

    const response = await fetch(decodedUrl, {
      method: 'GET',
      headers: reqHeaders,
    })

    const proxyHeaders = new Headers(response.headers)
    proxyHeaders.delete('content-encoding') 
    proxyHeaders.set('Content-Disposition', `attachment; filename="${filename}"`)

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: proxyHeaders,
    })
  } catch (error) {
    console.error('[MovieBox Proxy] Error proxying video stream:', error)
    return NextResponse.json({ error: 'Failed to proxy media' }, { status: 500 })
  }
}
