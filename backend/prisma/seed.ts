import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface TagData {
  name: string;
  slug: string;
  color: string;
  order: number;
  translations: Record<string, { name: string }>;
}

interface ChannelData {
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  order: number;
  isActive: boolean;
  allowPosts: boolean;
  translations: Record<string, { name: string; description: string }>;
  tags: TagData[];
}

async function main() {
  console.log('🌱 Seeding forum channels and tags...\n');

  const seedPath = path.join(__dirname, '..', 'src', 'data', 'forum-seed.json');
  if (!fs.existsSync(seedPath)) {
    console.error('❌ forum-seed.json not found at:', seedPath);
    process.exit(1);
  }

  const forumChannels: ChannelData[] = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

  for (const channelData of forumChannels) {
    const { tags, translations, ...channelFields } = channelData;

    const channel = await prisma.forumChannel.upsert({
      where: { slug: channelFields.slug },
      update: {
        name: channelFields.name,
        description: channelFields.description,
        icon: channelFields.icon,
        color: channelFields.color,
        order: channelFields.order,
        isActive: channelFields.isActive,
        allowPosts: channelFields.allowPosts,
        translations: JSON.stringify(translations),
      },
      create: {
        name: channelFields.name,
        slug: channelFields.slug,
        description: channelFields.description,
        icon: channelFields.icon,
        color: channelFields.color,
        order: channelFields.order,
        isActive: channelFields.isActive,
        allowPosts: channelFields.allowPosts,
        translations: JSON.stringify(translations),
      },
    });

    console.log(`  ✅ Channel: ${channelFields.icon} ${channelFields.name} (${channelFields.slug})`);

    for (const tagData of tags) {
      const { translations: tagTranslations, ...tagFields } = tagData;
      await prisma.forumTag.upsert({
        where: {
          channelId_slug: {
            slug: tagFields.slug,
            channelId: channel.id,
          },
        },
        update: {
          name: tagFields.name,
          color: tagFields.color,
          order: tagFields.order,
          translations: JSON.stringify(tagTranslations),
        },
        create: {
          name: tagFields.name,
          slug: tagFields.slug,
          color: tagFields.color,
          order: tagFields.order,
          channelId: channel.id,
          translations: JSON.stringify(tagTranslations),
        },
      });
      console.log(`     🏷️  Tag: ${tagFields.name}`);
    }
  }

  console.log(`\n✨ Seeded ${forumChannels.length} channels with their tags successfully!`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
