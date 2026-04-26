"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchMovies = searchMovies;
exports.extractShortlinks = extractShortlinks;
exports.bypassModpro = bypassModpro;
exports.extractDriveSeed = extractDriveSeed;
const cheerio = __importStar(require("cheerio"));
const express_1 = __importDefault(require("express"));
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.112 Safari/537.36";
// Reusable browser instance so we don't launch Chrome on every request
let browserInstance = null;
async function getBrowser() {
    if (browserInstance && browserInstance.connected) {
        return browserInstance;
    }
    console.log('[Puppeteer] Launching browser...');
    browserInstance = await puppeteer_extra_1.default.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    });
    console.log('[Puppeteer] Browser launched.');
    return browserInstance;
}
/**
 * Uses Puppeteer Stealth to navigate to a CF-protected URL,
 * waits for the challenge to resolve, and returns the final page HTML.
 */
async function fetchWithCFBypass(url) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
        await page.setUserAgent(USER_AGENT);
        await page.setViewport({ width: 1280, height: 720 });
        console.log(`[Puppeteer] Navigating to: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        // Wait for CF challenge to clear — poll until title changes from "Just a moment..."
        const maxWait = 20000;
        const start = Date.now();
        while (Date.now() - start < maxWait) {
            const title = await page.title();
            if (!title.includes('Just a moment') && !title.includes('Checking')) {
                console.log(`[Puppeteer] CF challenge cleared! Title: "${title}"`);
                break;
            }
            await new Promise(r => setTimeout(r, 1000));
        }
        // Small extra wait for page to fully settle
        await new Promise(r => setTimeout(r, 2000));
        const html = await page.content();
        const finalUrl = page.url();
        return { html, finalUrl };
    }
    finally {
        await page.close();
    }
}
async function searchMovies(title, year, type = 'movie', domain = 'moviesmod.farm', season) {
    if (domain === 'moviesleech.link') {
        const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        let urlsToTry = [];
        if (type === 'movie') {
            urlsToTry = [
                `https://moviesleech.link/download-${safeTitle}-${year}/`,
                `https://moviesleech.link/download-${safeTitle}-${year}-hindi-movie/`,
                `https://moviesleech.link/download-${safeTitle}-${year}-hindi-movie-hdtc/`,
                `https://moviesleech.link/download-${safeTitle}-${year}-hindi-dubbed-movie/`,
                `https://moviesleech.link/download-${safeTitle}-${year}-movie/`,
                `https://moviesleech.link/${safeTitle}-${year}/`
            ];
        }
        else if (type === 'tv' && season) {
            urlsToTry = [
                `https://moviesleech.link/download-${safeTitle}-${year}-season-${season}/`,
                `https://moviesleech.link/download-${safeTitle}-season-${season}/`,
                `https://moviesleech.link/download-${safeTitle}-${year}-season-${season}-hindi/`,
                `https://moviesleech.link/download-${safeTitle}-season-${season}-hindi/`,
                `https://moviesleech.link/download-${safeTitle}-${year}-season-${season}-hindi-web-series/`,
                `https://moviesleech.link/download-${safeTitle}-season-${season}-hindi-web-series/`,
                `https://moviesleech.link/${safeTitle}-${year}-season-${season}/`,
                `https://moviesleech.link/${safeTitle}-season-${season}/`
            ];
        }
        console.log(`[Scraper] Bypassing Cloudflare Search for moviesleech.link, guessing post URL for ${title}...`);
        for (const url of urlsToTry) {
            try {
                const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
                if (res.status === 200) {
                    const html = await res.text();
                    if (html.includes('maxbutton-fast-server-gdrive') || html.includes('leechpro.blog')) {
                        console.log(`[Scraper] Successfully guessed moviesleech URL: ${res.url}`);
                        return res.url;
                    }
                }
            }
            catch (e) { }
        }
        console.log(`[Scraper] Guessed URLs failed for ${title}`);
        return null;
    }
    const searchQuery = type === 'tv' ? title : `${title} ${year}`;
    const query = encodeURIComponent(searchQuery.trim());
    const url = `https://${domain}/?s=${query}`;
    try {
        const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
        const html = await res.text();
        const $ = cheerio.load(html);
        const firstResult = $('article').first().find('a').attr('href') || $('.post-title a').first().attr('href') || $('h2.title a').first().attr('href');
        if (!firstResult) {
            console.log(`[Scraper] No results found on ${domain} for ${query}`);
            return null;
        }
        return firstResult;
    }
    catch (err) {
        console.error(`[Scraper] Search Error:`, err);
        return null;
    }
}
async function extractShortlinks(postUrl, type = 'movie', targetSeason) {
    try {
        const res = await fetch(postUrl, { headers: { 'User-Agent': USER_AGENT } });
        const html = await res.text();
        const $ = cheerio.load(html);
        const possibleLinks = [];
        $('a').each((_, el) => {
            const href = $(el).attr('href');
            if (href && (href.includes('modpro.blog') || href.includes('leechpro.blog') || href.includes('modpro'))) {
                const text = $(el).text().trim() || "Download";
                let pre1 = $(el).parent().prev().text().trim();
                let pre2 = $(el).parent().prev().prev().text().trim();
                let pre3 = $(el).parent().prev().prev().prev().text().trim();
                let contextText = (text + " " + pre1 + " " + pre2 + " " + pre3).toLowerCase();
                let rawLabel = (pre1.length > 5 && pre1.length < 100) ? pre1 :
                    (pre2.length > 5 && pre2.length < 100) ? pre2 : "Download Link";
                if (rawLabel.toLowerCase().includes('download link') && pre2 && pre2.length > 5) {
                    rawLabel = pre2;
                }
                let label = rawLabel.replace(/^Download\s*/i, '').replace(/Links?$/i, '').trim() || "Premium Node";
                const qualityMatch = label.match(/(480p|720p|1080p|2160p|4k).*$/i);
                if (qualityMatch) {
                    label = qualityMatch[0].trim();
                }
                label = label.replace(/\[.*?\]$/, '').trim();
                if (type === 'tv') {
                    const isSeasonPack = contextText.includes('season') || contextText.includes('zip') || contextText.includes('batch') || contextText.includes('pack') || contextText.includes('complete');
                    const episodeRegex = /(episode|ep\s*\d+|s\d{1,2}e\d{1,3}|\be\d{1,3}\b)/i;
                    const explicitlyEpisode = episodeRegex.test(text) || episodeRegex.test(pre1);
                    const immediatePack = /(zip|pack|batch|season|complete)/i.test(text) || /(zip|pack|batch|season|complete)/i.test(pre1);
                    if (!isSeasonPack || (explicitlyEpisode && !immediatePack)) {
                        return;
                    }
                    if (targetSeason !== undefined) {
                        const seasonRegex = /season\s*(\d+)/i;
                        const foundSeasonMatch = contextText.match(seasonRegex) || rawLabel.match(seasonRegex);
                        if (foundSeasonMatch) {
                            const foundSeason = parseInt(foundSeasonMatch[1]);
                            if (foundSeason !== targetSeason) {
                                return;
                            }
                        }
                    }
                    const isBatchZipBtn = /(batch|zip|📂)/i.test(text);
                    const existingIdx = possibleLinks.findIndex(l => l.label === label);
                    if (existingIdx === -1) {
                        possibleLinks.push({ url: href.replace(/#clickimage$/, ''), label, _isBatch: isBatchZipBtn });
                    }
                    else if (isBatchZipBtn && !possibleLinks[existingIdx]._isBatch) {
                        possibleLinks[existingIdx] = { url: href.replace(/#clickimage$/, ''), label, _isBatch: true };
                    }
                }
                else {
                    if (!possibleLinks.find(l => l.url === href.replace(/#clickimage$/, ''))) {
                        const dupCount = possibleLinks.filter(l => l.label.includes(label)).length;
                        const finalLabel = dupCount > 0 ? `${label} (Alt ${dupCount + 1})` : label;
                        possibleLinks.push({ url: href.replace(/#clickimage$/, ''), label: finalLabel });
                    }
                }
            }
        });
        return possibleLinks;
    }
    catch (e) {
        console.error(`[Scraper] Quality Extractor Error:`, e);
        return [];
    }
}
async function bypassModpro(shortUrl) {
    console.log(`[Scraper] Bypassing Shortlink via Puppeteer: ${shortUrl}`);
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
        await page.setUserAgent(USER_AGENT);
        await page.setViewport({ width: 1280, height: 720 });
        // Step 1: Navigate to modpro link and bypass Cloudflare
        console.log(`[Puppeteer] Navigating to: ${shortUrl}`);
        await page.goto(shortUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        // Wait for CF challenge to clear
        const maxWait = 20000;
        let start = Date.now();
        while (Date.now() - start < maxWait) {
            const title = await page.title();
            if (!title.includes('Just a moment') && !title.includes('Checking')) {
                console.log(`[Puppeteer] CF challenge cleared! Title: "${title}"`);
                break;
            }
            await new Promise(r => setTimeout(r, 1000));
        }
        // Step 2: Wait for the 5-second timer to generate links
        console.log(`[Puppeteer] Waiting for timer & Fast Server button...`);
        await new Promise(r => setTimeout(r, 7000)); // Wait 7s to be safe
        // Step 3: Click the Fast Server (G-Drive) button if it exists — STAY in the same session
        const fastBtnClicked = await page.evaluate(() => {
            const btn = document.querySelector('a.maxbutton-fast-server-gdrive');
            if (btn && btn.href) {
                btn.click();
                return true;
            }
            return false;
        });
        if (fastBtnClicked) {
            console.log(`[Puppeteer] Clicked Fast Server button, waiting for navigation...`);
            await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => { });
            // Wait for any CF challenge on the new domain too
            start = Date.now();
            while (Date.now() - start < maxWait) {
                const title = await page.title();
                if (!title.includes('Just a moment') && !title.includes('Checking') && !title.includes('Landing')) {
                    console.log(`[Puppeteer] New page loaded! Title: "${title}", URL: ${page.url()}`);
                    break;
                }
                await new Promise(r => setTimeout(r, 1000));
            }
            await new Promise(r => setTimeout(r, 3000)); // Extra settle time
        }
        // Step 4: Now extract _wp_http from the current page
        const html1 = await page.content();
        let $ = cheerio.load(html1);
        const wpHttpInput = $('input[name="_wp_http"]').attr('value');
        if (!wpHttpInput) {
            const title = $('title').text();
            console.error(`[Scraper] Page title: "${title}". URL: ${page.url()}`);
            console.error(`[Scraper] HTML snippet: ${html1.substring(0, 500)}`);
            throw new Error(`Could not find _wp_http token. Page title: "${title}"`);
        }
        console.log(`[Scraper] Got _wp_http token! Proceeding with form submission...`);
        let formAction = $('form').attr('action');
        if (!formAction)
            throw new Error("Could not find form action.");
        const currentUrl = page.url();
        if (!formAction.startsWith('http')) {
            const urlObj = new URL(currentUrl);
            formAction = `${urlObj.origin}${formAction.startsWith('/') ? '' : '/'}${formAction}`;
        }
        const timerHost = new URL(formAction).host;
        const timerOrigin = new URL(formAction).origin;
        // From here on, we can use regular fetch — the timer domain doesn't have CF
        const defaultHeaders = {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        };
        const postHeaders = {
            ...defaultHeaders,
            "Host": timerHost,
            "Content-Type": "application/x-www-form-urlencoded",
            "Origin": timerOrigin,
            "Referer": currentUrl
        };
        const data1 = new URLSearchParams();
        data1.append('_wp_http', wpHttpInput);
        const r2 = await fetch(formAction, {
            method: 'POST',
            headers: postHeaders,
            body: data1.toString()
        });
        const html2 = await r2.text();
        const $2 = cheerio.load(html2);
        let action2 = $2('form').attr('action');
        if (!action2)
            throw new Error("No second form found");
        if (!action2.startsWith('http'))
            action2 = timerOrigin + action2;
        const wpHttp2Input = $2('input[name="_wp_http2"]').attr('value');
        const tokenInput = $2('input[name="token"]').attr('value');
        if (!wpHttp2Input || !tokenInput)
            throw new Error("Missing second _wp_http2 or token");
        const data2 = new URLSearchParams();
        data2.append('_wp_http2', wpHttp2Input);
        data2.append('token', tokenInput);
        const r3 = await fetch(action2, {
            method: 'POST',
            headers: postHeaders,
            body: data2.toString()
        });
        const html3 = await r3.text();
        const match1 = html3.match(/pepe-[a-zA-Z\d]+/);
        const match2 = html3.match(/'eJ(.*?)',\s*\d+\)/);
        if (match1 && match2) {
            const pepeNumber = match1[0];
            const pepeVal = `eJ${match2[1]}`;
            const verifyUrl = `${timerOrigin}/?go=${pepeNumber}`;
            const cookieName = verifyUrl.replace(/^.*?pepe-/, 'pepe-');
            const cookieHeaders = {
                ...defaultHeaders,
                "Cookie": `${cookieName}=${pepeVal}`
            };
            const r4 = await fetch(verifyUrl, { headers: cookieHeaders });
            const html4 = await r4.text();
            const metaRefresh = cheerio.load(html4)('meta[http-equiv="refresh"]').attr('content');
            if (metaRefresh) {
                const redirectUrl = metaRefresh.split('url=')[1];
                const modi5Base = redirectUrl.substring(0, redirectUrl.indexOf('/r?'));
                const r5 = await fetch(redirectUrl, { headers: defaultHeaders });
                const html5 = await r5.text();
                const finalMatch = html5.match(/window\.location\.replace\("([^"]+)"\)/);
                if (finalMatch) {
                    console.log(`[Scraper] Bypass SUCCESS!`);
                    return `${modi5Base}${finalMatch[1]}`;
                }
            }
        }
        throw new Error("Could not extract final url from pepe tokens");
    }
    catch (e) {
        console.error(`[Scraper] Bypass Error:`, e);
        return null;
    }
    finally {
        await page.close();
    }
}
async function extractDriveSeed(driveseedUrl) {
    console.log(`[Scraper] Extracting Driveseed Final Link: ${driveseedUrl}`);
    try {
        const res = await fetch(driveseedUrl, { headers: { 'User-Agent': USER_AGENT } });
        const html = await res.text();
        const $ = cheerio.load(html);
        let finalCdnLink = null;
        let zfileLink = null;
        $('a').each((_, el) => {
            const text = $(el).text().toLowerCase();
            const href = $(el).attr('href');
            if (href) {
                if (text.includes('instant download') || text.includes('resume download') || text.includes('download')) {
                    if ((href.includes('cdn.') || href.startsWith('http')) && !href.includes('driveseed.')) {
                        finalCdnLink = href;
                    }
                }
                if (href.includes('/zfile/')) {
                    zfileLink = href;
                }
            }
        });
        if (!finalCdnLink && zfileLink) {
            const zUrl = zfileLink.startsWith('http') ? zfileLink : new URL(zfileLink, driveseedUrl).toString();
            console.log(`[Scraper] Following zfile link: ${zUrl}`);
            const zRes = await fetch(zUrl, { headers: { 'User-Agent': USER_AGENT } });
            const zHtml = await zRes.text();
            const $z = cheerio.load(zHtml);
            $z('a').each((_, el) => {
                const text = $z(el).text().toLowerCase();
                const href = $z(el).attr('href');
                if (href && (text.includes('resume') || text.includes('download'))) {
                    if (href.startsWith('http') && !href.includes('driveseed.')) {
                        finalCdnLink = href;
                    }
                }
            });
        }
        if (!finalCdnLink)
            return null;
        const redirRes = await fetch(finalCdnLink, {
            headers: { 'User-Agent': USER_AGENT },
            redirect: 'manual'
        });
        const location = redirRes.headers.get('location');
        if (location && location.includes('?url=')) {
            const finalUrlParams = new URL(location).searchParams;
            return finalUrlParams.get('url') || location;
        }
        return finalCdnLink;
    }
    catch (e) {
        console.error(`[Scraper] Driveseed Extractor Error:`, e);
        return null;
    }
}
// --- EXPRESS SERVER ---
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.send("Scraper is running!");
});
app.post('/api/scrape', async (req, res) => {
    const { action, ...params } = req.body;
    try {
        if (action === 'searchMovies') {
            const result = await searchMovies(params.title, params.year, params.type, params.domain, params.season);
            res.json({ result });
        }
        else if (action === 'extractShortlinks') {
            const result = await extractShortlinks(params.postUrl, params.type, params.targetSeason);
            res.json({ result });
        }
        else if (action === 'bypassModpro') {
            const result = await bypassModpro(params.shortUrl);
            res.json({ result });
        }
        else if (action === 'extractDriveSeed') {
            const result = await extractDriveSeed(params.driveseedUrl);
            res.json({ result });
        }
        else {
            res.status(400).json({ error: "Unknown action" });
        }
    }
    catch (e) {
        console.error("API Error:", e);
        res.status(500).json({ error: "Scraping failed", message: e.message });
    }
});
const PORT = process.env.PORT || 7860;
app.listen(PORT, () => {
    console.log(`Scraper API listening on port ${PORT}`);
});
