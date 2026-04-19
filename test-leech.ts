import { searchMovies, extractShortlink, bypassModpro, extractDriveSeed } from './src/lib/scraper';

async function main() {
    console.log("Searching Moviesleech for Toaster 2026...");
    const postUrl = await searchMovies("Toaster", "2026", "movie", "moviesleech.link");
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
    
    // Test for multiple qualities:
    console.log("Extracting all qualities...");
    // Let's print out what `extractShortlink` really finds. I'll modify the script locally if needed.
}

main().catch(console.error);
