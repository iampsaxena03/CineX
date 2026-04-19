import { bypassModpro } from './src/lib/scraper';

async function testDriveSeedSource() {
    const driveSeed = await bypassModpro('https://links.modpro.blog/archives/153768');
    const res = await fetch(driveSeed!);
    const html = await res.text();
    console.log("DriveSeed HTML snippet:");
    console.log(html.substring(0, 1500));
    console.log("...");
    console.log(html.substring(html.length - 1500));
}

testDriveSeedSource().catch(console.error);
