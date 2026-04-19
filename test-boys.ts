import * as cheerio from 'cheerio';
import { searchMovies } from './src/lib/scraper';

async function testBoys() {
    const postUrl = await searchMovies("The Boys", "2019", "tv", "moviesmod.farm");
    console.log("Found post:", postUrl);

    if (!postUrl) return;

    const res = await fetch(postUrl, {
        headers: { 'User-Agent': "Mozilla/5.0" }
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    let matchCount = 0;
    $('a').each((i, el) => {
        const href = $(el).attr('href');
        if (href && (href.includes('modpro.blog') || href.includes('leechpro.blog') || href.includes('modpro'))) {
            matchCount++;
            const text = $(el).text().trim() || "Download";
            let pre1 = $(el).parent().prev().text().trim();
            let pre2 = $(el).parent().prev().prev().text().trim();
            let pre3 = $(el).parent().prev().prev().prev().text().trim();
            
            let contextText = (text + " " + pre1 + " " + pre2 + " " + pre3).toLowerCase();
            
            const isSeasonPack = contextText.includes('season') || contextText.includes('zip') || contextText.includes('batch') || contextText.includes('pack') || contextText.includes('complete');
            const explicitlyEpisode = text.toLowerCase().includes('episode') || pre1.toLowerCase().includes('episode') || text.toLowerCase().match(/ep\s*\d+/) || pre1.toLowerCase().match(/ep\s*\d+/);
            
            console.log(`\n--- Match ${matchCount} ---`);
            console.log("TEXT:", text);
            console.log("PRE1:", pre1);
            console.log("PRE2:", pre2);
            console.log("PRE3:", pre3);
            console.log("isSeasonPack:", isSeasonPack, "| explicitlyEpisode:", !!explicitlyEpisode);
        }
    });

    console.log("Total matches:", matchCount);
}

testBoys().catch(console.error);
