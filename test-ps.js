const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('test-boys.html'));

let count = 0;
$('a').each((i, el) => {
    const h = $(el).attr('href');
    if (h && h.includes('modpro')) {
        count++;
        if (count > 15) return; // just print first 15 to get an idea
        console.log('--- LINK ---');
        console.log("P3:", $(el).parent().prev().prev().prev().text().trim());
        console.log("P2:", $(el).parent().prev().prev().text().trim());
        console.log("P1:", $(el).parent().prev().text().trim());
        console.log("P0:", $(el).parent().text().trim());
    }
});
