const cheerio = require('cheerio');
const fs = require('fs');

async function dump() {
    const fetchRes = await fetch("https://moviesmod.farm/?s=The+Boys", { headers: {"User-Agent": "Mozilla/5.0"} });
    const htmlSearch = await fetchRes.text();
    const $s = cheerio.load(htmlSearch);
    
    let postUrl = $s('.post-title a').first().attr('href') || $s('article').first().find('a').attr('href');
    if (!postUrl) postUrl = $s('h2.title a').first().attr('href');
    
    if (!postUrl) return console.log("No post URL found");
    
    const res = await fetch(postUrl, { headers: {"User-Agent": "Mozilla/5.0"} });
    const html = await res.text();
    fs.writeFileSync("test-boys.html", html);
    console.log("Saved to test-boys.html");
}

dump().catch(console.error);
