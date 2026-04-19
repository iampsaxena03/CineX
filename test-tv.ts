import { searchMovies, extractShortlinks } from './src/lib/scraper';

async function testTV() {
    console.log("Searching MoviesMod for Fallout 2024 (TV)...");
    const postUrl = await searchMovies("Fallout", "2024", "tv", "moviesmod.farm");
    console.log("Found post:", postUrl);

    if (postUrl) {
       const links = await extractShortlinks(postUrl, 'tv');
       console.log("Extracted TV Links:");
       console.log(links);
    }
}

testTV().catch(console.error);
