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
  const allowedHosts = ['bcdnxw.hakunaymatata.com', 'valiw.hakunaymatata.com', 'cacdn.hakunaymatata.com']
  const isAllowed = allowedHosts.some(h => decodedUrl.startsWith(`https://${h}/`))
  if (!isAllowed) {
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
    proxyHeaders.set('Access-Control-Allow-Origin', '*')

    // Handle Subtitle Conversion (SRT -> VTT)
    if (filename.endsWith('.srt') || filename.endsWith('.vtt')) {
      proxyHeaders.set('Content-Type', 'text/vtt; charset=utf-8')
      proxyHeaders.delete('Content-Disposition')
      
      let text = await response.text()
      if (filename.endsWith('.srt')) {
        // Simple SRT to VTT translation (replace time comma with dot)
        text = 'WEBVTT\n\n' + text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
      }
      
      return new Response(text, {
        status: response.status,
        statusText: response.statusText,
        headers: proxyHeaders,
      })
    }

    // Normal Media Streaming
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
