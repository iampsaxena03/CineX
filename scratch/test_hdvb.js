import { extractHDVBLinks } from '../src/lib/hdvb';

async function test() {
    try {
        // Test with Matrix (tt0133093)
        const links = await extractHDVBLinks('tt0133093', 'movie');
        console.log('Result:', JSON.stringify(links, null, 2));
    } catch (e) {
        console.error('Test failed:', e);
    }
}

test();
