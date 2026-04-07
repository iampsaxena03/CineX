 

async function test() {
  console.log("Testing APIs...");
  const gpUrl = 'https://api.gplinks.com/api?api=e8960ac8e77431af6f8643ff3728aea32d4e1fc8&url=https://dl.vidsrc.vip/movie/123&format=text';
  const exeUrl = 'https://exe.io/api?api=3a82cc56b2762a23b440b033bc854b5d7fbd38bb&url=https://dl.vidsrc.vip/movie/123&format=text';
  
  try {
    const r1 = await fetch(gpUrl);
    const t1 = await r1.text();
    console.log("GPlinks status:", r1.status, "text:", t1);
  } catch(e) { console.log("GP Err", e); }

  try {
    const r2 = await fetch(exeUrl);
    const t2 = await r2.text();
    console.log("Exe.io status:", r2.status, "text:", t2);
  } catch(e) { console.log("EXE Err", e); }
}

test();
