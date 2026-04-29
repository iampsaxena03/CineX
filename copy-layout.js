const { Client } = require('pg');

const oldUrl = 'postgresql://neondb_owner:npg_fQgT4CSYrZ8i@ep-lucky-wind-anb34cdb-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const newUrl = 'postgresql://neondb_owner:npg_mp4Xwv7CORSK@ep-calm-brook-amym3xnx-pooler.c-5.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

async function main() {
    const oldClient = new Client({ connectionString: oldUrl });
    const newClient = new Client({ connectionString: newUrl });

    await oldClient.connect();
    await newClient.connect();

    console.log('Fetching old layout data...');
    const { rows: sections } = await oldClient.query('SELECT * FROM "HomeSection"');
    const { rows: items } = await oldClient.query('SELECT * FROM "HomeSectionItem"');
    const { rows: settings } = await oldClient.query('SELECT * FROM "AppSettings"');

    console.log(`Found ${sections.length} sections, ${items.length} items, and ${settings.length} settings.`);

    console.log('Clearing new database existing layout...');
    await newClient.query('DELETE FROM "HomeSectionItem"');
    await newClient.query('DELETE FROM "HomeSection"');
    await newClient.query('DELETE FROM "AppSettings"');

    console.log('Inserting sections...');
    for (const sec of sections) {
        await newClient.query(
            `INSERT INTO "HomeSection" (id, key, title, type, "order", visible, "maxItems", "autoFill", "createdAt", "updatedAt") 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [sec.id, sec.key, sec.title, sec.type, sec.order, sec.visible, sec.maxItems, sec.autoFill, sec.createdAt, sec.updatedAt]
        );
    }

    console.log('Inserting items...');
    for (const item of items) {
        await newClient.query(
            `INSERT INTO "HomeSectionItem" (id, "tmdbId", "mediaType", position, "preferredStream", "sectionId", "createdAt") 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [item.id, item.tmdbId, item.mediaType, item.position, item.preferredStream, item.sectionId, item.createdAt]
        );
    }

    console.log('Inserting settings...');
    for (const s of settings) {
        await newClient.query(
            `INSERT INTO "AppSettings" (id, key, value, "updatedAt") 
             VALUES ($1, $2, $3, $4)`,
            [s.id, s.key, s.value, s.updatedAt]
        );
    }

    console.log('Successfully copied layout and settings!');
    await oldClient.end();
    await newClient.end();
}

main().catch(console.error);
