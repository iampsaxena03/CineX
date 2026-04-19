async function checkMod() {
    console.log("Checking moviesmod.farm...");
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const res = await fetch('https://moviesmod.farm/?s=Fallout', {
            headers: { 'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.112 Safari/537.36" },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        console.log("Status:", res.status);
        console.log("Headers:", Object.fromEntries(res.headers.entries()));
        
        const text = await res.text();
        console.log("Response text length:", text.length);
        if (text.includes("Just a moment")) {
             console.log("CLOUDFLARE UAM IS ON!");
        } else {
             console.log("No Cloudflare UAM.");
        }
    } catch(e) {
        console.error(e);
    }
}
checkMod().catch(console.error);
