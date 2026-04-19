const cheerio = require('cheerio');

async function search() {
   const res = await fetch('https://moviesmod.farm/?s=Fallout', {
      headers: { 'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
   });
   const html = await res.text();
   const $ = cheerio.load(html);
   
   const firstResult = $('article').first().find('a').attr('href') || $('.post-title a').first().attr('href') || $('h2.title a').first().attr('href');
   console.log("First Result:", firstResult);

   if (firstResult) {
      const pRes = await fetch(firstResult, {
         headers: { 'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });
      const pHtml = await pRes.text();
      const $p = cheerio.load(pHtml);

      $p('a').each((i, el) => {
         const href = $p(el).attr('href');
         if (href && href.includes('modpro')) {
            const text = $p(el).text();
            let preText = $p(el).parent().text() + " " + $p(el).parent().prev().text() + " " + $p(el).parent().prev().prev().text();
            console.log("--- Link Found ---");
            console.log("HREF:", href);
            console.log("TEXT:", text);
            console.log("CONTEXT:", preText.toLowerCase());
         }
      });
   }
}
search().catch(console.error);
