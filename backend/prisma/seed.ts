import { PrismaClient, Role, NodeType, ContentStatus, ContentType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import slugify from 'slugify';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding...');

  const salt = await bcrypt.genSalt(10);

  // ===================== USERS =====================
  const superadmin = await prisma.user.upsert({
    where: { email: 'superadmin@adably.id' },
    update: {},
    create: {
      email: 'superadmin@adably.id',
      passwordHash: await bcrypt.hash('superadmin123', salt),
      name: 'Abu Ahmad (SuperAdmin)',
      role: Role.SUPERADMIN,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@adably.id' },
    update: {},
    create: {
      email: 'admin@adably.id',
      passwordHash: await bcrypt.hash('admin123', salt),
      name: 'Ummu Salma (Admin)',
      role: Role.ADMIN,
    },
  });

  const editor = await prisma.user.upsert({
    where: { email: 'editor@adably.id' },
    update: {},
    create: {
      email: 'editor@adably.id',
      passwordHash: await bcrypt.hash('editor123', salt),
      name: 'Ustadz Farid (Author)',
      role: Role.AUTHOR,
    },
  });
  console.log('✅ Users created (SuperAdmin, Admin, Author)');

  // ===================== SETTINGS =====================
  await prisma.setting.upsert({
    where: { key: 'ai_checker_enabled' },
    update: {},
    create: { group: 'ai', key: 'ai_checker_enabled', value: 'true' },
  });
  await prisma.setting.upsert({
    where: { key: 'donation_enabled' },
    update: {},
    create: { group: 'donation', key: 'donation_enabled', value: 'true' },
  });
  await prisma.setting.upsert({
    where: { key: 'donation_title' },
    update: {},
    create: { group: 'donation', key: 'donation_title', value: 'Dukung Adably 🌱' },
  });
  await prisma.setting.upsert({
    where: { key: 'donation_message' },
    update: {},
    create: { group: 'donation', key: 'donation_message', value: 'Bantu kami terus menyajikan konten parenting islami secara gratis untuk keluarga Muslim.' },
  });
  await prisma.setting.upsert({
    where: { key: 'donation_methods' },
    update: {},
    create: { group: 'donation', key: 'donation_methods', value: JSON.stringify([
      { type: 'bank', label: 'BSI (Bank Syariah Indonesia)', value: '7171234567' },
      { type: 'qris', label: 'QRIS', value: 'https://example.com/qris-Adably' },
      { type: 'saweria', label: 'Saweria', value: 'https://saweria.co/Adably' },
    ]) },
  });
  console.log('✅ Settings initialized (AI + Donation)');

  // Announcement banner
  await prisma.setting.upsert({
    where: { key: 'announcement_enabled' },
    update: {},
    create: { group: 'announcement', key: 'announcement_enabled', value: 'false' },
  });
  await prisma.setting.upsert({
    where: { key: 'announcement_text' },
    update: {},
    create: { group: 'announcement', key: 'announcement_text', value: 'Selamat datang di Adably! Platform edukasi Islam anak.' },
  });
  await prisma.setting.upsert({
    where: { key: 'announcement_type' },
    update: {},
    create: { group: 'announcement', key: 'announcement_type', value: 'info' },
  });

  // ===================== TAGS =====================
  const tagNames = ['Tauhid', 'Aqidah', 'Ibadah', 'Shalat', 'Adab', 'Akhlak', 'Kisah Nabi', 'Doa', 'Puasa', 'Quran'];
  const tags: Record<string, any> = {};
  for (const name of tagNames) {
    tags[name] = await prisma.contentTag.upsert({
      where: { slug: slugify(name, { lower: true }) },
      update: {},
      create: { name, slug: slugify(name, { lower: true }), usageCount: 0 },
    });
  }
  console.log('✅ Tags created');

  // ===================== CONTENT TREE =====================
  const categories = [
    { title: 'Tauhid & Aqidah', icon: 'shield', desc: 'Mengenal Allah, Rukun Iman, dan dasar-dasar keimanan.' },
    { title: 'Ibadah Harian', icon: 'calendar', desc: 'Panduan shalat, wudhu, doa, dan puasa untuk anak.' },
    { title: 'Adab & Akhlak', icon: 'heart', desc: 'Tata krama Islami dalam kehidupan sehari-hari.' },
    { title: 'Kisah Nabi & Sahabat', icon: 'book-open', desc: 'Kisah-kisah inspiratif para Nabi dan Sahabat Radhiyallahu anhum.' },
    { title: 'Doa & Dzikir Anak', icon: 'sparkles', desc: 'Kumpulan doa harian dan dzikir ringan untuk anak.' },
  ];

  const categoryNodes: Record<string, any> = {};
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    categoryNodes[cat.title] = await prisma.contentNode.upsert({
      where: { slug: slugify(cat.title, { lower: true }) },
      update: {},
      create: {
        title: cat.title,
        slug: slugify(cat.title, { lower: true }),
        description: cat.desc,
        type: NodeType.CATEGORY,
        icon: cat.icon,
        order: i + 1,
        ageGroups: ['3-5', '5-7', '7-10'],
      },
    });
  }
  console.log('✅ Categories created');

  // ===================== MODULES & TOPICS =====================

  // -- Tauhid Modules --
  const modMengenalAllah = await prisma.contentNode.upsert({
    where: { slug: 'mengenal-allah' },
    update: {},
    create: { title: 'Mengenal Allah', slug: 'mengenal-allah', type: NodeType.MODULE, parentId: categoryNodes['Tauhid & Aqidah'].id, order: 1, ageGroups: ['3-5', '5-7'] },
  });
  const modRukunIman = await prisma.contentNode.upsert({
    where: { slug: 'rukun-iman' },
    update: {},
    create: { title: 'Rukun Iman', slug: 'rukun-iman', type: NodeType.MODULE, parentId: categoryNodes['Tauhid & Aqidah'].id, order: 2, ageGroups: ['5-7', '7-10'] },
  });

  // Topics under Mengenal Allah
  const topicMahaMelihat = await prisma.contentNode.upsert({
    where: { slug: 'allah-maha-melihat' },
    update: {},
    create: { title: 'Allah Maha Melihat', slug: 'allah-maha-melihat', type: NodeType.TOPIC, parentId: modMengenalAllah.id, order: 1, ageGroups: ['3-5', '5-7'] },
  });
  const topicAllahDiAtas = await prisma.contentNode.upsert({
    where: { slug: 'allah-di-atas-arsy' },
    update: {},
    create: { title: 'Allah di Atas Arsy', slug: 'allah-di-atas-arsy', type: NodeType.TOPIC, parentId: modMengenalAllah.id, order: 2, ageGroups: ['5-7', '7-10'] },
  });

  // -- Ibadah Modules --
  const modShalat = await prisma.contentNode.upsert({
    where: { slug: 'belajar-shalat' },
    update: {},
    create: { title: 'Belajar Shalat', slug: 'belajar-shalat', type: NodeType.MODULE, parentId: categoryNodes['Ibadah Harian'].id, order: 1, ageGroups: ['5-7', '7-10'] },
  });
  const modWudhu = await prisma.contentNode.upsert({
    where: { slug: 'belajar-wudhu' },
    update: {},
    create: { title: 'Belajar Wudhu', slug: 'belajar-wudhu', type: NodeType.MODULE, parentId: categoryNodes['Ibadah Harian'].id, order: 2, ageGroups: ['5-7', '7-10'] },
  });

  // -- Adab Modules --
  const modAdabMakan = await prisma.contentNode.upsert({
    where: { slug: 'adab-makan' },
    update: {},
    create: { title: 'Adab Makan & Minum', slug: 'adab-makan', type: NodeType.MODULE, parentId: categoryNodes['Adab & Akhlak'].id, order: 1, ageGroups: ['3-5', '5-7'] },
  });

  console.log('✅ Modules & Topics created');

  // ===================== CONTENT ITEMS =====================

  // --- QnA 1: Allah Maha Melihat ---
  const qna1Title = 'Apakah Allah melihat saat aku sembunyi?';
  const qna1 = await prisma.contentItem.upsert({
    where: { slug: slugify(qna1Title, { lower: true }) },
    update: {},
    create: {
      title: qna1Title, slug: slugify(qna1Title, { lower: true }),
      type: ContentType.QNA, status: ContentStatus.PUBLISHED,
      nodeId: topicMahaMelihat.id, authorId: editor.id, ageGroup: '5-7',
      viewCount: 245, likeCount: 78, avgRating: 4.9, ratingCount: 32, publishedAt: new Date(),
      description: 'Menjelaskan sifat Al-Bashiir kepada anak dengan analogi sederhana.',
      qnaDetail: {
        create: {
          question: 'Apakah Allah melihat saat aku bersembunyi di bawah selimut?',
          answerQuick: 'Tentu! Allah Maha Melihat (Al-Bashiir). Tidak ada satu pun yang tersembunyi dari-Nya.',
          dialogBlocks: [
            { role: 'anak', text: 'Ummi, kalau aku makan coklat diam-diam di bawah meja, ada yang lihat nggak?' },
            { role: 'ortu', text: 'Mungkin Ummi tidak lihat. Tapi ada Yang selalu melihat, bahkan di tempat gelap sekalipun.' },
            { role: 'anak', text: 'Siapa, Ummi?' },
            { role: 'ortu', text: 'Allah Ta\'ala. Salah satu nama Allah adalah Al-Bashiir, artinya Maha Melihat. Allah melihat semut hitam, di atas batu hitam, di malam yang gelap.' },
          ],
          dalilBlocks: [
            { text: 'Sesungguhnya Allah mengetahui apa yang ghaib di langit dan di bumi. Dan Allah Maha Melihat apa yang kamu kerjakan.', source: 'QS. Al-Hujurat: 18' },
            { text: 'Dia mengetahui (pandangan) mata yang khianat dan apa yang disembunyikan oleh hati.', source: 'QS. Ghafir: 19' },
          ],
          analogyBlocks: [
            { title: 'Lampu Senter Super', text: 'Bayangkan lampu senter paling terang di dunia. Allah melihat jauh lebih hebat dari itu — menembus dinding, gunung, bahkan kegelapan malam!' },
          ],
          tipsBlocks: [
            { text: 'Sampaikan dengan nada lembut dan senyuman agar anak merasa diawasi dengan cinta, bukan takut.' },
            { text: 'Ajak anak berdoa: "Ya Allah, jadikan aku anak yang jujur karena Engkau selalu melihatku."' },
          ],
        },
      },
    },
  });

  // --- QnA 2: Allah di Atas Arsy ---
  const qna2Title = 'Di mana Allah berada?';
  const qna2 = await prisma.contentItem.upsert({
    where: { slug: slugify(qna2Title, { lower: true }) },
    update: {},
    create: {
      title: qna2Title, slug: slugify(qna2Title, { lower: true }),
      type: ContentType.QNA, status: ContentStatus.PUBLISHED,
      nodeId: topicAllahDiAtas.id, authorId: editor.id, ageGroup: '5-7',
      viewCount: 189, likeCount: 62, avgRating: 4.8, ratingCount: 25, publishedAt: new Date(),
      description: 'Menjelaskan bahwa Allah berada di atas Arsy, sesuai pemahaman Sahabat.',
      qnaDetail: {
        create: {
          question: 'Di mana Allah? Apakah Allah ada di mana-mana?',
          answerQuick: 'Allah berada di atas Arsy (singgasana-Nya) yang berada di atas langit ketujuh, sesuai yang Allah kabarkan sendiri.',
          dialogBlocks: [
            { role: 'anak', text: 'Abi, Allah itu ada di mana sih?' },
            { role: 'ortu', text: 'Allah berada di atas, Nak. Di atas langit ketujuh, di atas singgasana-Nya yang disebut Arsy.' },
            { role: 'anak', text: 'Kalau Allah di atas, berarti Allah jauh dong?' },
            { role: 'ortu', text: 'Allah memang tinggi di atas sana, tapi ilmu dan penglihatan Allah meliputi segalanya. Jadi doa kita pasti sampai!' },
          ],
          dalilBlocks: [
            { text: '(Yaitu) Ar-Rahman (Yang Maha Pemurah), yang bersemayam di atas Arsy.', source: 'QS. Thaha: 5' },
            { text: 'Rasulullah ﷺ bertanya kepada seorang budak perempuan: "Di mana Allah?" Ia menjawab: "Di atas langit." Beliau berkata: "Merdekakanlah ia, karena dia adalah seorang mukminah."', source: 'HR. Muslim no. 537' },
          ],
          analogyBlocks: [
            { title: 'Raja di Istananya', text: 'Seperti raja yang duduk di istananya yang sangat tinggi, tapi perintahnya sampai ke seluruh negeri. Allah di atas Arsy, tapi ilmu-Nya meliputi seluruh alam.' },
          ],
          tipsBlocks: [
            { text: 'Ini adalah aqidah yang diajarkan Rasulullah ﷺ dan dipahami para Sahabat. Ajarkan kepada anak sejak kecil.' },
          ],
        },
      },
    },
  });

  // --- QnA 3: Kenapa Kita Shalat ---
  const qna3Title = 'Kenapa kita harus shalat?';
  const qna3 = await prisma.contentItem.upsert({
    where: { slug: slugify(qna3Title, { lower: true }) },
    update: {},
    create: {
      title: qna3Title, slug: slugify(qna3Title, { lower: true }),
      type: ContentType.QNA, status: ContentStatus.PUBLISHED,
      nodeId: modShalat.id, authorId: editor.id, ageGroup: '5-7',
      viewCount: 312, likeCount: 95, avgRating: 4.9, ratingCount: 41, publishedAt: new Date(),
      description: 'Menjelaskan hikmah shalat dengan bahasa yang mudah dipahami anak.',
      qnaDetail: {
        create: {
          question: 'Kenapa sih kita harus shalat setiap hari?',
          answerQuick: 'Karena shalat adalah perintah Allah yang paling utama. Shalat adalah cara kita berbicara dan dekat dengan Allah.',
          dialogBlocks: [
            { role: 'anak', text: 'Ummi, kenapa kita harus shalat terus? Kan capek...' },
            { role: 'ortu', text: 'Hmm, kamu kan suka ngobrol sama Ummi dan Abi? Nah, shalat itu kayak ngobrol sama Allah!' },
            { role: 'anak', text: 'Tapi kok Allah nggak jawab?' },
            { role: 'ortu', text: 'Allah menjawab, Nak! Setiap kita baca Al-Fatihah, Allah menjawab setiap ayatnya. Kita yang belum bisa dengar saja.' },
          ],
          dalilBlocks: [
            { text: 'Dan dirikanlah shalat. Sesungguhnya shalat itu mencegah dari perbuatan keji dan mungkar.', source: 'QS. Al-Ankabut: 45' },
            { text: 'Rasulullah ﷺ bersabda: "Perintahkanlah anak-anak kalian untuk shalat ketika berusia tujuh tahun."', source: 'HR. Abu Dawud no. 495, dishahihkan Al-Albani' },
          ],
          analogyBlocks: [
            { title: 'Mengisi Daya Baterai', text: 'Seperti HP yang harus di-charge 5x sehari agar tidak mati, hati kita juga butuh "di-charge" dengan shalat 5 waktu agar tetap kuat dan bahagia.' },
          ],
          tipsBlocks: [
            { text: 'Ajak anak shalat berjamaah sejak usia 7 tahun. Buat suasana shalat menyenangkan, bukan memaksa.' },
          ],
        },
      },
    },
  });

  // --- Article 1: Adab Makan ---
  const art1Title = 'Panduan Adab Makan untuk Anak Muslim';
  const art1 = await prisma.contentItem.upsert({
    where: { slug: slugify(art1Title, { lower: true }) },
    update: {},
    create: {
      title: art1Title, slug: slugify(art1Title, { lower: true }),
      type: ContentType.ARTICLE, status: ContentStatus.PUBLISHED,
      nodeId: modAdabMakan.id, authorId: admin.id, ageGroup: '3-5',
      viewCount: 156, likeCount: 43, avgRating: 4.7, ratingCount: 18, publishedAt: new Date(),
      description: 'Tata cara makan sesuai Sunnah yang diajarkan untuk anak usia dini.',
      articleDetail: {
        create: {
          blocks: [
            { type: 'heading', text: '1. Membaca Bismillah Sebelum Makan' },
            { type: 'paragraph', text: 'Rasulullah ﷺ bersabda: "Jika salah seorang di antara kalian makan, hendaklah menyebut nama Allah. Jika lupa menyebut nama Allah di awalnya, hendaklah mengucapkan: Bismillahi awwalahu wa aakhirahu." (HR. Abu Dawud no. 3767, dishahihkan Al-Albani)' },
            { type: 'heading', text: '2. Makan dengan Tangan Kanan' },
            { type: 'paragraph', text: 'Rasulullah ﷺ bersabda: "Janganlah seseorang di antara kalian makan dengan tangan kirinya dan jangan pula minum dengannya, karena sesungguhnya setan makan dan minum dengan tangan kirinya." (HR. Muslim no. 2020)' },
            { type: 'heading', text: '3. Makan dari yang Terdekat' },
            { type: 'paragraph', text: 'Umar bin Abi Salamah berkata: "Rasulullah ﷺ berkata kepadaku: Wahai anak kecil, sebutlah nama Allah, makanlah dengan tangan kananmu, dan makanlah dari makanan yang ada di dekatmu." (HR. Bukhari no. 5376, Muslim no. 2022)' },
            { type: 'tip', text: 'Ajarkan anak dengan cara praktik langsung di meja makan. Puji anak ketika melakukannya dengan benar.' },
          ],
        },
      },
    },
  });

  // --- Article 2 (REVIEW status to demo the workflow) ---
  const art2Title = 'Kisah Nabi Ibrahim dan Berhala Kaumnya';
  const art2 = await prisma.contentItem.upsert({
    where: { slug: slugify(art2Title, { lower: true }) },
    update: {},
    create: {
      title: art2Title, slug: slugify(art2Title, { lower: true }),
      type: ContentType.ARTICLE, status: ContentStatus.REVIEW,
      nodeId: categoryNodes['Kisah Nabi & Sahabat'].id, authorId: editor.id, ageGroup: '7-10',
      description: 'Kisah keberanian Nabi Ibrahim alaihissalam menghancurkan berhala kaumnya.',
      articleDetail: {
        create: {
          blocks: [
            { type: 'heading', text: 'Ketika Ibrahim Kecil Bertanya' },
            { type: 'paragraph', text: 'Sejak kecil, Ibrahim alaihissalam sudah merasa aneh. Kenapa ayahnya dan kaumnya menyembah patung yang tidak bisa bicara, tidak bisa mendengar, dan tidak bisa memberi manfaat? Ini dikisahkan Allah dalam QS. Al-Anbiya: 52-67.' },
            { type: 'heading', text: 'Menghancurkan Berhala' },
            { type: 'paragraph', text: 'Suatu hari, ketika kaumnya pergi meninggalkan kuil, Ibrahim menghancurkan semua berhala kecuali yang paling besar. Ketika ditanya, ia berkata: "Tanyakan saja kepada berhala besar itu!" Tentu saja berhala itu tidak bisa menjawab. Ini adalah bukti bahwa hanya Allah saja yang layak disembah.' },
            { type: 'dalil', text: '"Apakah kamu menyembah apa yang kamu pahat sendiri? Padahal Allah-lah yang menciptakan kamu dan apa yang kamu kerjakan." (QS. Ash-Shaffat: 95-96)' },
          ],
        },
      },
    },
  });

  // Link tags to content
  const tagLinks = [
    { contentId: qna1.id, tagId: tags['Tauhid'].id },
    { contentId: qna1.id, tagId: tags['Aqidah'].id },
    { contentId: qna2.id, tagId: tags['Tauhid'].id },
    { contentId: qna2.id, tagId: tags['Aqidah'].id },
    { contentId: qna3.id, tagId: tags['Ibadah'].id },
    { contentId: qna3.id, tagId: tags['Shalat'].id },
    { contentId: art1.id, tagId: tags['Adab'].id },
    { contentId: art1.id, tagId: tags['Akhlak'].id },
    { contentId: art2.id, tagId: tags['Kisah Nabi'].id },
  ];

  for (const link of tagLinks) {
    await prisma.contentItemTag.upsert({
      where: { contentId_tagId: { contentId: link.contentId, tagId: link.tagId } },
      update: {},
      create: link,
    });
  }
  console.log('✅ Content Items & Tags linked');

  // ===================== AUTHOR STATS =====================
  await prisma.authorStat.upsert({
    where: { authorId: editor.id },
    update: {},
    create: { authorId: editor.id, totalPublished: 3, totalViews: 746, totalLikes: 235, avgContentRating: 4.87 },
  });
  await prisma.authorStat.upsert({
    where: { authorId: admin.id },
    update: {},
    create: { authorId: admin.id, totalPublished: 1, totalViews: 156, totalLikes: 43, avgContentRating: 4.7 },
  });
  console.log('✅ Author Stats created');

  console.log('\n🎉 Seeding Complete!');
  console.log('📋 Login Credentials:');
  console.log('   SuperAdmin: superadmin@adably.id / superadmin123');
  console.log('   Admin:      admin@adably.id / admin123');
  console.log('   Author:     editor@adably.id / editor123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
