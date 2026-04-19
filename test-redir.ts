import { bypassModpro, extractDriveSeed } from './src/lib/scraper';

async function testFetch() {
    const driveSeed = await bypassModpro('https://links.modpro.blog/archives/153768');
    const stream = await extractDriveSeed(driveSeed!);
    console.log("Extracted URL:", stream);
    
    // Node.js native fetch handles redirects by default. We'll do it manually to see if it redirects.
    let response = await fetch(stream, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        redirect: 'manual'
    });
    console.log("Status:", response.status);
    console.log("Headers:", response.headers);
    if(response.headers.get('location')) {
         console.log("Location:", response.headers.get('location'));
    }
}

testFetch().catch(console.error);
