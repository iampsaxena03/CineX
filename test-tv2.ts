import * as cheerio from 'cheerio';
async function run() {
   const res = await fetch('https://moviesmod.farm/?s=Fallout', { headers: { 'User-Agent': 'Mozilla/5.0' } });
   const html = await res.text();
   const $ = cheerio.load(html);
   
   $('h2.title a, .post-title a, article a').each((i, el) => {
       const href = $(el).attr('href');
       if(href && href.includes('download')) console.log($(el).text(), "->", href);
   });
}
run().catch(console.error);
