import { bypassModpro, extractDriveSeed } from './src/lib/scraper';

async function testVideoSeed() {
    // 1. Bypass Modpro
    const driveSeed = await bypassModpro('https://links.modpro.blog/archives/153768');
    
    // 2. Extract Driveseed Location Replace
    const stream = await extractDriveSeed(driveSeed!);
    console.log("Stream URL:", stream);
    
    // 3. Fetch videoseed page HTML
    const res = await fetch(stream, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
    });
    const html = await res.text();
    console.log("Response Body:", html);
}

testVideoSeed().catch(console.error);
