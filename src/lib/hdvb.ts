import * as cheerio from 'cheerio';

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.112 Safari/537.36";

export async function extractHDVBLinks(id: string, type: 'movie' | 'tv', season?: number, episode?: number) {
    console.log(`[HDVB Extractor] Starting for ${id} (${type})`);

    // 1. Fetch the embed page
    // Mirror domains for piexe411qok.com: Piexe, HDVB, etc.
    const baseUrl = 'https://piexe411qok.com/play';
    let url = `${baseUrl}/${id}`;
    if (type === 'tv' && season && episode) {
        url += `?s=${season}&e=${episode}`;
    }

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT
            }
        });
        const html = await res.text();
        console.log(`[HDVB Extractor] HTML Length: ${html.length}`);
        console.log(`[HDVB Extractor] HTML Sample: ${html.substring(0, 500)}`);

        // 2. Extract p3 config
        const p3Match = html.match(/let p3 = ({.*?});/s);
        if (!p3Match) {
            console.error('[HDVB Extractor] Could not find p3 config');
            return [];
        }

        const p3 = JSON.parse(p3Match[1]);
        const playlistUrl = p3.file;
        const key = p3.key;

        if (!playlistUrl) {
            console.error('[HDVB Extractor] No playlist URL found in p3');
            return [];
        }

        console.log(`[HDVB Extractor] Found playlist: ${playlistUrl}`);

        // 3. Fetch the playlist
        // Most HDVB playlists require the embed page or the host site as Referer
        const playlistRes = await fetch(playlistUrl, {
            headers: {
                'User-Agent': USER_AGENT,
                'Referer': 'https://1xcinema.net/' // Trying host site referer
            }
        });

        let playlistContent = await playlistRes.text();

        // If we get a short numeric response, it likely failed referer check or is rate limited
        if (playlistContent.length < 50) {
            console.warn(`[HDVB Extractor] Short response from playlist: ${playlistContent}`);
            // Fallback: Try with different referer or no referer
            const retryRes = await fetch(playlistUrl, {
                headers: { 'User-Agent': USER_AGENT }
            });
            playlistContent = await retryRes.text();
        }

        // 4. Decrypt / Parse playlist
        // This is the tricky part. For now, let's assume it's a JSON or a list of URLs.
        // We will implement a basic decoder if we find standard patterns.

        return parsePlaylist(playlistContent, id, type, season, episode);

    } catch (err) {
        console.error('[HDVB Extractor] Error:', err);
        return [];
    }
}

/**
 * Decodes PlayerJS obfuscated strings
 * Usually involves a custom base64-like replacement mapping
 */
function decodePlayerJS(data: string) {
    if (!data) return '';

    // Pattern 1: Hex-like encoding starting with #
    if (data.startsWith('#')) {
        let res = '';
        data = data.substring(1);
        for (let i = 0; i < data.length; i += 2) {
            res += String.fromCharCode(parseInt(data.substring(i, i + 2), 16));
        }
        return res;
    }

    // Pattern 2: Custom Base64 with character shifting
    // This is hard to guess without the exact key mapping, 
    // but often it's a simple rotation or substitution.
    // Let's try at least a base64 decode if it looks like one.
    try {
        if (data.includes('==') || data.length > 100) {
            // Remove common obfuscation characters
            const clean = data.replace(/[\$!]/g, '').replace(/_/g, '/').replace(/-/g, '+');
            return Buffer.from(clean, 'base64').toString('utf8');
        }
    } catch (e) {
        // Fallback to raw
    }

    return data;
}

function parsePlaylist(content: string, id: string, type: string, season?: number, episode?: number) {
    console.log(`[HDVB Extractor] Parsing playlist content (length: ${content.length})`);

    // Decrypt if necessary
    let decoded = decodePlayerJS(content);

    // If it's still not JSON/URL, try a second pass of decoding (some sites double encode)
    if (!decoded.startsWith('[') && !decoded.startsWith('{') && !decoded.startsWith('http')) {
        decoded = decodePlayerJS(decoded);
    }

    try {
        // Check if it's JSON
        if (decoded.startsWith('[') || decoded.startsWith('{')) {
            const data = JSON.parse(decoded);
            // Handle array of sources
            const sources = Array.isArray(data) ? data : (data.playlist || []);
            if (Array.isArray(sources)) {
                return sources.map((s: any, i: number) => ({
                    id: `hdvb-${id}-${i}`,
                    quality: s.label || s.title || (s.file?.includes('1080') ? '1080p' : '720p'),
                    label: `Stream 2 - ${s.label || s.title || 'Mirror'}`,
                    url: s.file || s.url,
                    size: ''
                })).filter(l => l.url);
            }
        }

        // Check if it's already a direct link or m3u8
        if (decoded.startsWith('http')) {
            return [{
                id: `hdvb-${id}-direct`,
                quality: 'Max',
                label: 'Stream 2 - High Speed',
                url: decoded.trim(),
                size: ''
            }];
        }

        console.warn('[HDVB Extractor] Could not parse playlist content format after decoding');
        return [];

    } catch (e) {
        console.error('[HDVB Extractor] Parse error:', e);
        return [];
    }
}
