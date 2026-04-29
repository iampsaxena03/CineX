import { PrismaClient } from '@prisma/client';

const oldUrl = 'postgresql://neondb_owner:npg_fQgT4CSYrZ8i@ep-lucky-wind-anb34cdb-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const newUrl = 'postgresql://neondb_owner:npg_mp4Xwv7CORSK@ep-calm-brook-amym3xnx-pooler.c-5.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

const prismaOld = new PrismaClient({ datasourceUrl: oldUrl });
const prismaNew = new PrismaClient({ datasourceUrl: newUrl });

async function main() {
    console.log('Fetching old layout data...');
    const sections = await prismaOld.homeSection.findMany({ include: { items: true } });
    const settings = await prismaOld.appSettings.findMany();

    console.log(`Found ${sections.length} sections and ${settings.length} settings.`);

    console.log('Clearing new database existing layout (just in case)...');
    await prismaNew.homeSectionItem.deleteMany();
    await prismaNew.homeSection.deleteMany();
    await prismaNew.appSettings.deleteMany();

    console.log('Inserting sections...');
    for (const sec of sections) {
        const createdSec = await prismaNew.homeSection.create({
            data: {
                id: sec.id,
                title: sec.title,
                type: sec.type,
                position: sec.position,
                isActive: sec.isActive,
                createdAt: sec.createdAt,
                updatedAt: sec.updatedAt,
            }
        });
        
        if (sec.items && sec.items.length > 0) {
            await prismaNew.homeSectionItem.createMany({
                data: sec.items.map(item => ({
                    id: item.id,
                    tmdbId: item.tmdbId,
                    mediaType: item.mediaType,
                    position: item.position,
                    preferredStream: item.preferredStream,
                    sectionId: createdSec.id,
                    createdAt: item.createdAt,
                }))
            });
        }
    }

    console.log('Inserting settings...');
    if (settings.length > 0) {
        await prismaNew.appSettings.createMany({
            data: settings.map(s => ({
                id: s.id,
                key: s.key,
                value: s.value,
                updatedAt: s.updatedAt,
            }))
        });
    }

    console.log('Successfully copied layout and settings!');
}

main().catch(console.error).finally(async () => {
    await prismaOld.$disconnect();
    await prismaNew.$disconnect();
});
