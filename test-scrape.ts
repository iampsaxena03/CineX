import { searchMovies, extractShortlink, bypassModpro, extractDriveSeed } from './src/lib/scraper';

async function main() {
    console.log("Searching MoviesMod for The Whistler 2026...");
    const postUrl = await searchMovies("The Whistler", "2026", "movie", "moviesmod.farm");
    if (!postUrl) {
        console.log("Failed to find post.");
        return;
    }
    console.log("Found post:", postUrl);

    console.log("Extracting links...");
    const shortLink = await extractShortlink(postUrl, '1080p');
    if (!shortLink) {
        console.log("Failed to extract shortlink");
        return;
    }
    console.log("Found shortlink:", shortLink);
    
    const driveSeed = await bypassModpro(shortLink);
    if (!driveSeed) {
        console.log("Bypass failed");
        return;
    }
    console.log("Found Driveseed:", driveSeed);
    
    const stream = await extractDriveSeed(driveSeed);
    console.log("Final Stream Link:", stream);
}

main().catch(console.error);
