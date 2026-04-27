import { PrismaClient, Role, NodeType, ContentStatus, ContentType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import slugify from 'slugify';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding...');

  // 1. Create SuperAdmin
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('superadmin123', salt);

  const superadmin = await prisma.user.upsert({
    where: { email: 'superadmin@deenkids.com' },
    update: {},
    create: {
      email: 'superadmin@deenkids.com',
      passwordHash,
      name: 'Super Admin',
      role: Role.SUPERADMIN,
    },
  });
  console.log('✅ SuperAdmin created');

  // Create Editor
  const editorHash = await bcrypt.hash('editor123', salt);
  const editor = await prisma.user.upsert({
    where: { email: 'editor@deenkids.com' },
    update: {},
    create: {
      email: 'editor@deenkids.com',
      passwordHash: editorHash,
      name: 'Content Writer',
      role: Role.EDITOR,
    },
  });
  console.log('✅ Editor created');

  // 2. Initial Settings
  await prisma.setting.upsert({
    where: { key: 'ai_checker_enabled' },
    update: {},
    create: { group: 'ai', key: 'ai_checker_enabled', value: 'true' },
  });
  await prisma.setting.upsert({
    where: { key: 'donation_enabled' },
    update: {},
    create: { group: 'general', key: 'donation_enabled', value: 'true' },
  });
  console.log('✅ Settings initialized');

  // 3. Content Tree (Curriculum)
  const categories = [
    { title: 'Tauhid & Aqidah', icon: 'sun' },
    { title: 'Adab & Akhlak', icon: 'heart' },
    { title: 'Ibadah Harian', icon: 'masjid' }, // Assuming custom icon identifier
    { title: 'Kisah Nabi', icon: 'book' },
  ];

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const categoryNode = await prisma.contentNode.upsert({
      where: { slug: slugify(cat.title, { lower: true }) },
      update: {},
      create: {
        title: cat.title,
        slug: slugify(cat.title, { lower: true }),
        type: NodeType.CATEGORY,
        icon: cat.icon,
        order: i + 1,
        ageGroups: ['3-5', '5-7', '7-10'],
      },
    });

    // Add Modules inside Tauhid
    if (cat.title === 'Tauhid & Aqidah') {
      const moduleNode = await prisma.contentNode.upsert({
        where: { slug: 'mengenal-allah' },
        update: {},
        create: {
          title: 'Mengenal Allah',
          slug: 'mengenal-allah',
          type: NodeType.MODULE,
          parentId: categoryNode.id,
          order: 1,
          ageGroups: ['3-5', '5-7'],
        },
      });

      const topicNode = await prisma.contentNode.upsert({
        where: { slug: 'allah-maha-melihat' },
        update: {},
        create: {
          title: 'Allah Maha Melihat',
          slug: 'allah-maha-melihat',
          type: NodeType.TOPIC,
          parentId: moduleNode.id,
          order: 1,
          ageGroups: ['3-5', '5-7'],
        },
      });

      // 4. Sample Content Item (QnA)
      const qnaTitle = "Apakah Allah melihat saat aku sembunyi?";
      const qnaSlug = slugify(qnaTitle, { lower: true });
      
      const content = await prisma.contentItem.upsert({
        where: { slug: qnaSlug },
        update: {},
        create: {
          title: qnaTitle,
          slug: qnaSlug,
          type: ContentType.QNA,
          status: ContentStatus.PUBLISHED,
          nodeId: topicNode.id,
          authorId: editor.id,
          ageGroup: '5-7',
          viewCount: 120,
          likeCount: 45,
          avgRating: 4.8,
          ratingCount: 15,
          publishedAt: new Date(),
          qnaDetail: {
            create: {
              question: "Apakah Allah melihat saat aku bersembunyi di bawah selimut?",
              answerQuick: "Tentu saja, Allah melihat semua yang kita lakukan karena Allah Al-Bashiir (Maha Melihat).",
              dialogBlocks: [
                { role: "anak", text: "Ummi, kalau aku makan coklat diam-diam di bawah meja, ada yang lihat tidak?" },
                { role: "ortu", text: "Hmm.. mungkin Ummi dan Abi tidak lihat. Tapi ada yang selalu melihat setiap saat." },
                { role: "anak", text: "Siapa itu Ummi?" },
                { role: "ortu", text: "Allah Ta'ala. Nama Allah adalah Al-Bashiir, artinya Maha Melihat." }
              ],
              dalilBlocks: [
                { text: "Sesungguhnya Allah mengetahui apa yang ghaib di langit dan di bumi. Dan Allah Maha Melihat apa yang kamu kerjakan.", source: "QS. Al-Hujurat: 18" }
              ],
              analogyBlocks: [
                { title: "Kamera CCTV", text: "Seperti kamera CCTV yang bisa merekam semuanya, penglihatan Allah jauh lebih hebat karena menembus batas dinding dan kegelapan." }
              ],
              tipsBlocks: [
                { text: "Berikan senyuman saat menceritakan ini agar anak tidak merasa takut yang berlebihan, melainkan merasa diawasi dan dilindungi." }
              ]
            }
          }
        }
      });

      // Tag
      const tag = await prisma.contentTag.upsert({
        where: { slug: 'tauhid' },
        update: {},
        create: { name: 'Tauhid', slug: 'tauhid', usageCount: 1 }
      });
      
      await prisma.contentItemTag.upsert({
        where: { contentId_tagId: { contentId: content.id, tagId: tag.id } },
        update: {},
        create: { contentId: content.id, tagId: tag.id }
      });

      console.log('✅ Content Tree & Sample QnA seeded');
    }
  }

  console.log('🎉 Seeding Complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
