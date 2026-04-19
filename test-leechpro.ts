import { extractShortlink, bypassModpro, extractDriveSeed } from './src/lib/scraper';

async function main() {
    console.log("Bypassing leechpro...");
    const shortLink = "https://leechpro.blog/archives/34849";
    
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
