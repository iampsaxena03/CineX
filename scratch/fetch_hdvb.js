const fs = require('fs');
async function testHdvb() {
  const url = 'https://piexe411qok.com/play/tt15398776';
  const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.112 Safari/537.36' };
  const res = await fetch(url, { headers });
  const html = await res.text();
  
  const match = html.match(/let\s+p3\s*=\s*(\{.*?\});/);
  if (match) {
    const config = JSON.parse(match[1]);
    console.log("File URL:", config.file);
    const pRes = await fetch(config.file, { method: 'POST', headers: { ...headers, Referer: url, Origin: new URL(url).origin } });
    const pText = await pRes.text();
    console.log("Status:", pRes.status);
    console.log("Playlist content preview:", pText.substring(0, 1500));
  }
}
testHdvb();
