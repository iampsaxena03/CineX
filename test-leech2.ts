import * as cheerio from 'cheerio';

async function testMoviesLeech() {
    const res = await fetch("https://moviesleech.link/?s=Toaster", {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    console.log("Title:", $('title').text());
}

testMoviesLeech().catch(console.error);
