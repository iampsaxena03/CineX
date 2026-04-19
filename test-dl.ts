import { searchMovies, extractShortlinks, bypassModpro, extractDriveSeed } from './src/lib/scraper';

async function testDownload() {
    console.log("Searching MoviesMod for The Whistler 2026...");
    const postUrl = await searchMovies("The Whistler", "2026", "movie", "moviesmod.farm");
    const links = await extractShortlinks(postUrl, 'movie');
    
    console.log("Found links:", links);
    if (!links.length) return;

    const driveSeed = await bypassModpro(links[0].url);
    const stream = await extractDriveSeed(driveSeed);
    console.log("Stream:", stream);

    const res = await fetch(stream, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
    });
    console.log("Response status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));

    const text = await res.text();
    console.log("Text snippet:", text.substring(0, 500));
}

testDownload().catch(console.error);
