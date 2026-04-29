import { PrismaClient, Role, NodeType, ContentStatus, ContentType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import slugify from 'slugify';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding...');

  const salt = await bcrypt.genSalt(10);

  // ===================== CLEANUP OLD USERS =====================
  const oldEmails = ['admin@deenkids.com', 'superadmin@deenkids.com', 'editor@deenkids.com'];
  for (const email of oldEmails) {
    const oldUser = await prisma.user.findUnique({ where: { email } });
    if (oldUser) {
      // Delete all related data (cascading handles most, but manual for non-cascade)
      await prisma.contentItem.deleteMany({ where: { authorId: oldUser.id } });
      await prisma.internalNotification.deleteMany({ where: { userId: oldUser.id } });
      await prisma.pointLedger.deleteMany({ where: { userId: oldUser.id } });
      await prisma.withdrawalRequest.deleteMany({ where: { userId: oldUser.id } });
      await prisma.authorStat.deleteMany({ where: { authorId: oldUser.id } });
      await prisma.reward.deleteMany({ where: { userId: oldUser.id } });
      await prisma.user.delete({ where: { id: oldUser.id } });
      console.log(`🗑️ Removed old user: ${email}`);
    }
  }

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

  // Reward settings
  const rewardSettings = [
    { group: 'reward', key: 'point_per_approved', value: '10' },
    { group: 'reward', key: 'point_views_milestone', value: '5' },
    { group: 'reward', key: 'point_likes_milestone', value: '3' },
    { group: 'reward', key: 'point_to_rupiah', value: '1000' },
    { group: 'reward', key: 'min_withdrawal_points', value: '50' },
    { group: 'reward', key: 'max_submit_per_day', value: '5' },
    { group: 'ai', key: 'ai_api_key', value: '' },
  ];
  for (const s of rewardSettings) {
    await prisma.setting.upsert({ where: { key: s.key }, update: {}, create: s });
  }
  console.log('✅ Reward & AI settings initialized');

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

  // --- QnA 4: Apa itu Syirik (7-10) ---
  const qna4Title = 'Apa itu syirik dan kenapa sangat bahaya?';
  const qna4 = await prisma.contentItem.upsert({
    where: { slug: slugify(qna4Title, { lower: true }) },
    update: {},
    create: {
      title: qna4Title, slug: slugify(qna4Title, { lower: true }),
      type: ContentType.QNA, status: ContentStatus.PUBLISHED,
      nodeId: modRukunIman.id, authorId: editor.id, ageGroup: '7-10',
      viewCount: 134, likeCount: 55, avgRating: 4.8, ratingCount: 20, publishedAt: new Date(),
      description: 'Penjelasan tentang syirik dengan bahasa yang mudah dipahami anak usia 7-10 tahun.',
      qnaDetail: {
        create: {
          question: 'Apa itu syirik? Kenapa kata Ustadz itu dosa paling besar?',
          answerQuick: 'Syirik adalah menyembah atau meminta tolong kepada selain Allah dalam perkara yang hanya Allah yang mampu. Ini dosa terbesar karena Allah tidak mengampuninya jika pelakunya tidak bertaubat.',
          dialogBlocks: [
            { role: 'anak', text: 'Abi, kata Ustadz syirik itu dosa paling besar. Memangnya apa sih syirik?' },
            { role: 'ortu', text: 'Syirik itu artinya menyekutukan Allah. Misalnya, berdoa kepada selain Allah, atau percaya ada yang bisa memberi rezeki selain Allah.' },
            { role: 'anak', text: 'Kalau pakai jimat biar nggak sakit, itu syirik?' },
            { role: 'ortu', text: 'Benar sekali, Nak. Yang menyembuhkan hanya Allah. Jimat tidak punya kekuatan apa-apa. Rasulullah ﷺ melarang memakai jimat.' },
          ],
          dalilBlocks: [
            { text: 'Sesungguhnya Allah tidak mengampuni dosa syirik, dan Dia mengampuni dosa selain itu bagi siapa yang Dia kehendaki.', source: 'QS. An-Nisa: 48' },
            { text: 'Rasulullah ﷺ bersabda: "Barangsiapa menggantungkan jimat, maka dia telah berbuat syirik."', source: 'HR. Ahmad, dishahihkan Al-Albani' },
          ],
          analogyBlocks: [
            { title: 'Remote TV', text: 'Bayangkan kamu minta remote TV untuk memasak nasi. Bisa nggak? Tentu tidak! Nah, meminta tolong kepada batu, pohon, atau makhluk dalam urusan yang hanya Allah mampu itu sama anehnya!' },
          ],
          tipsBlocks: [
            { text: 'Jelaskan dengan lembut bahwa syirik bukan hanya menyembah patung, tapi juga percaya kepada jimat, dukun, dan ramalan bintang.' },
            { text: 'Ajarkan anak selalu berdoa langsung kepada Allah tanpa perantara.' },
          ],
        },
      },
    },
  });

  // --- QnA 5: Siapa yang menciptakan alam (3-5) ---
  const qna5Title = 'Siapa yang menciptakan langit dan bumi?';
  const qna5 = await prisma.contentItem.upsert({
    where: { slug: slugify(qna5Title, { lower: true }) },
    update: {},
    create: {
      title: qna5Title, slug: slugify(qna5Title, { lower: true }),
      type: ContentType.QNA, status: ContentStatus.PUBLISHED,
      nodeId: topicMahaMelihat.id, authorId: admin.id, ageGroup: '3-5',
      viewCount: 198, likeCount: 72, avgRating: 4.9, ratingCount: 28, publishedAt: new Date(),
      description: 'Mengenalkan konsep Allah sebagai Pencipta kepada anak balita dengan bahasa sederhana.',
      qnaDetail: {
        create: {
          question: 'Ummi, siapa yang bikin langit? Siapa yang bikin kucing?',
          answerQuick: 'Allah yang menciptakan semuanya! Langit, bumi, gunung, kucing, bunga — semuanya ciptaan Allah.',
          dialogBlocks: [
            { role: 'anak', text: 'Ummi, siapa yang bikin bulan?' },
            { role: 'ortu', text: 'Allah yang membuatnya, Sayang. Allah yang membuat bulan, bintang, matahari, semuanya!' },
            { role: 'anak', text: 'Kalau kucing? Siapa yang bikin kucing?' },
            { role: 'ortu', text: 'Allah juga! Allah menciptakan semua hewan — kucing, burung, ikan, semut. Hebat kan Allah?' },
          ],
          dalilBlocks: [
            { text: 'Allah-lah yang menciptakan langit dan bumi dan apa yang ada di antara keduanya dalam enam masa.', source: 'QS. As-Sajdah: 4' },
          ],
          analogyBlocks: [
            { title: 'Siapa yang Buat Kue?', text: 'Kalau ada kue di meja, pasti ada yang membuatnya kan? Nah, langit dan bumi ini jauh lebih hebat dari kue — pasti ada yang membuatnya, yaitu Allah!' },
          ],
          tipsBlocks: [
            { text: 'Ajak anak jalan-jalan ke taman dan tunjukkan ciptaan Allah: pohon, bunga, burung. Katakan "Subhanallah, ini ciptaan Allah!"' },
          ],
        },
      },
    },
  });

  // --- QnA 6: Bagaimana cara berwudhu (5-7) ---
  const qna6Title = 'Bagaimana cara berwudhu yang benar?';
  const qna6 = await prisma.contentItem.upsert({
    where: { slug: slugify(qna6Title, { lower: true }) },
    update: {},
    create: {
      title: qna6Title, slug: slugify(qna6Title, { lower: true }),
      type: ContentType.QNA, status: ContentStatus.PUBLISHED,
      nodeId: modWudhu.id, authorId: editor.id, ageGroup: '5-7',
      viewCount: 267, likeCount: 88, avgRating: 4.9, ratingCount: 35, publishedAt: new Date(),
      description: 'Langkah-langkah wudhu sesuai Sunnah untuk anak-anak.',
      qnaDetail: {
        create: {
          question: 'Bagaimana cara wudhu yang benar seperti Rasulullah ﷺ?',
          answerQuick: 'Wudhu dimulai dengan niat, lalu cuci tangan, kumur, hidung, muka, tangan sampai siku, usap kepala, dan terakhir cuci kaki.',
          dialogBlocks: [
            { role: 'anak', text: 'Abi, aku mau belajar wudhu. Gimana caranya?' },
            { role: 'ortu', text: 'Bagus sekali! Pertama, niatkan dalam hati untuk berwudhu karena Allah. Lalu baca Bismillah.' },
            { role: 'anak', text: 'Terus cuci apa dulu?' },
            { role: 'ortu', text: 'Cuci kedua telapak tangan 3 kali, kumur-kumur 3 kali, lalu masukkan air ke hidung dan keluarkan 3 kali. Setelah itu cuci muka 3 kali.' },
          ],
          dalilBlocks: [
            { text: 'Wahai orang-orang yang beriman, apabila kamu hendak mengerjakan shalat, maka basuhlah mukamu dan tanganmu sampai ke siku, dan sapulah kepalamu dan (basuh) kakimu sampai kedua mata kaki.', source: 'QS. Al-Maidah: 6' },
            { text: 'Rasulullah ﷺ berwudhu dengan membasuh setiap anggota wudhu tiga kali.', source: 'HR. Bukhari no. 159' },
          ],
          analogyBlocks: [
            { title: 'Mandi Sebelum ke Pesta', text: 'Sebelum ke pesta, kita mandi dulu biar bersih dan wangi kan? Nah, sebelum bertemu Allah di shalat, kita wudhu dulu biar suci dan siap!' },
          ],
          tipsBlocks: [
            { text: 'Praktikkan bersama anak di depan wastafel. Biarkan anak menirukan gerakan Anda step by step.' },
            { text: 'Jangan lupa ajarkan doa setelah wudhu: "Asyhadu an laa ilaaha illallah wa asyhadu anna Muhammadan abduhu wa rasuuluh"' },
          ],
        },
      },
    },
  });

  // --- Article 3: Doa Sehari-hari (3-5) ---
  const art3Title = 'Doa Sehari-hari untuk Anak Muslim';
  const art3 = await prisma.contentItem.upsert({
    where: { slug: slugify(art3Title, { lower: true }) },
    update: {},
    create: {
      title: art3Title, slug: slugify(art3Title, { lower: true }),
      type: ContentType.ARTICLE, status: ContentStatus.PUBLISHED,
      nodeId: categoryNodes['Doa & Dzikir Anak'].id, authorId: admin.id, ageGroup: '3-5',
      viewCount: 210, likeCount: 67, avgRating: 4.8, ratingCount: 22, publishedAt: new Date(),
      description: 'Kumpulan doa harian yang mudah dihafal untuk anak balita.',
      articleDetail: {
        create: {
          blocks: [
            { type: 'heading', text: '1. Doa Sebelum Makan' },
            { type: 'paragraph', text: '"Bismillah" — Dengan menyebut nama Allah. Rasulullah ﷺ bersabda: "Jika salah seorang kalian makan, hendaklah menyebut nama Allah." (HR. Abu Dawud no. 3767, dishahihkan Al-Albani)' },
            { type: 'heading', text: '2. Doa Sesudah Makan' },
            { type: 'paragraph', text: '"Alhamdulillahilladzi ath\'amanii haadza wa razaqaniihi min ghairi haulin minnii wa laa quwwah" — Segala puji bagi Allah yang telah memberi makan ini dan memberi rezeki kepadaku tanpa daya dan kekuatan dariku. (HR. Abu Dawud no. 4023, dihasankan Al-Albani)' },
            { type: 'heading', text: '3. Doa Sebelum Tidur' },
            { type: 'paragraph', text: '"Bismika Allahumma amuutu wa ahyaa" — Dengan nama-Mu ya Allah aku mati dan aku hidup. (HR. Bukhari no. 6324)' },
            { type: 'heading', text: '4. Doa Bangun Tidur' },
            { type: 'paragraph', text: '"Alhamdulillahilladzi ahyaanaa ba\'da maa amaatanaa wa ilaihin nusyuur" — Segala puji bagi Allah yang menghidupkan kami setelah mematikan kami, dan kepada-Nya lah kami dikembalikan. (HR. Bukhari no. 6325)' },
            { type: 'tip', text: 'Ajarkan satu doa setiap minggu. Tempelkan di dinding kamar anak agar mudah dihafal. Praktikkan bersama setiap hari.' },
          ],
        },
      },
    },
  });

  // --- Article 4: Mengenal Rukun Islam (5-7) ---
  const art4Title = 'Mengenal Lima Rukun Islam';
  const art4 = await prisma.contentItem.upsert({
    where: { slug: slugify(art4Title, { lower: true }) },
    update: {},
    create: {
      title: art4Title, slug: slugify(art4Title, { lower: true }),
      type: ContentType.ARTICLE, status: ContentStatus.PUBLISHED,
      nodeId: modShalat.id, authorId: editor.id, ageGroup: '5-7',
      viewCount: 175, likeCount: 58, avgRating: 4.7, ratingCount: 19, publishedAt: new Date(),
      description: 'Penjelasan lima rukun Islam dengan bahasa anak-anak.',
      articleDetail: {
        create: {
          blocks: [
            { type: 'heading', text: 'Apa itu Rukun Islam?' },
            { type: 'paragraph', text: 'Rukun Islam adalah lima tiang utama dalam agama Islam. Seperti rumah butuh tiang agar berdiri kokoh, agama kita juga butuh lima tiang ini.' },
            { type: 'heading', text: '1. Syahadat' },
            { type: 'paragraph', text: 'Mengucapkan "Asyhadu an laa ilaaha illallah wa asyhadu anna Muhammadan Rasulullah" — Aku bersaksi tidak ada Tuhan yang berhak disembah selain Allah, dan aku bersaksi bahwa Muhammad adalah utusan Allah.' },
            { type: 'heading', text: '2. Shalat' },
            { type: 'paragraph', text: 'Mendirikan shalat lima waktu: Subuh, Dzuhur, Ashar, Maghrib, dan Isya. Rasulullah ﷺ bersabda: "Perintahkanlah anak-anak kalian untuk shalat ketika berusia tujuh tahun." (HR. Abu Dawud no. 495)' },
            { type: 'heading', text: '3. Zakat' },
            { type: 'paragraph', text: 'Memberikan sebagian harta kepada yang membutuhkan. Ini mengajarkan kita untuk berbagi.' },
            { type: 'heading', text: '4. Puasa Ramadhan' },
            { type: 'paragraph', text: 'Menahan makan dan minum dari terbit fajar sampai terbenam matahari di bulan Ramadhan.' },
            { type: 'heading', text: '5. Haji' },
            { type: 'paragraph', text: 'Pergi ke Mekkah untuk beribadah bagi yang mampu. Ini dilakukan sekali seumur hidup.' },
            { type: 'dalil', text: '"Islam dibangun di atas lima perkara: Syahadat bahwa tidak ada Tuhan selain Allah dan Muhammad adalah utusan-Nya, mendirikan shalat, menunaikan zakat, berpuasa Ramadhan, dan haji ke Baitullah." (HR. Bukhari no. 8, Muslim no. 16)' },
          ],
        },
      },
    },
  });

  // --- Article 5: Kisah Nabi Nuh (7-10) ---
  const art5Title = 'Kisah Nabi Nuh dan Bahtera Penyelamat';
  const art5 = await prisma.contentItem.upsert({
    where: { slug: slugify(art5Title, { lower: true }) },
    update: {},
    create: {
      title: art5Title, slug: slugify(art5Title, { lower: true }),
      type: ContentType.ARTICLE, status: ContentStatus.PUBLISHED,
      nodeId: categoryNodes['Kisah Nabi & Sahabat'].id, authorId: admin.id, ageGroup: '7-10',
      viewCount: 145, likeCount: 51, avgRating: 4.8, ratingCount: 17, publishedAt: new Date(),
      description: 'Kisah keteguhan Nabi Nuh alaihissalam dalam berdakwah selama 950 tahun.',
      articleDetail: {
        create: {
          blocks: [
            { type: 'heading', text: 'Dakwah 950 Tahun' },
            { type: 'paragraph', text: 'Nabi Nuh alaihissalam berdakwah kepada kaumnya selama 950 tahun! Bayangkan betapa sabarnya beliau. Siang dan malam beliau mengajak kaumnya untuk menyembah Allah saja, tapi kebanyakan mereka menolak dan mengejeknya.' },
            { type: 'heading', text: 'Perintah Membuat Bahtera' },
            { type: 'paragraph', text: 'Allah memerintahkan Nabi Nuh membuat kapal besar (bahtera) di atas bukit. Orang-orang kafir menertawakannya: "Untuk apa membuat kapal di atas bukit?" Tapi Nabi Nuh tetap taat kepada Allah.' },
            { type: 'heading', text: 'Banjir Besar' },
            { type: 'paragraph', text: 'Ketika bahtera selesai, Allah menurunkan hujan sangat lebat dan air memancar dari dalam bumi. Banjir besar melanda seluruh tempat. Nabi Nuh dan orang-orang beriman naik ke bahtera bersama sepasang-sepasang hewan. Mereka selamat atas izin Allah.' },
            { type: 'dalil', text: '"Dan Nuh berkata: Naiklah kamu sekalian ke dalamnya dengan menyebut nama Allah pada waktu berlayar dan berlabuhnya. Sesungguhnya Tuhanku benar-benar Maha Pengampun lagi Maha Penyayang." (QS. Hud: 41)' },
            { type: 'heading', text: 'Pelajaran dari Kisah Nabi Nuh' },
            { type: 'paragraph', text: '1. Sabar dalam berdakwah meskipun diejek.\n2. Taat kepada Allah meskipun tidak masuk akal bagi manusia.\n3. Allah pasti menyelamatkan orang-orang beriman.\n4. Keselamatan bukan karena hubungan darah, tapi karena iman. Anak Nabi Nuh sendiri tenggelam karena menolak beriman.' },
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
    { contentId: qna4.id, tagId: tags['Tauhid'].id },
    { contentId: qna4.id, tagId: tags['Aqidah'].id },
    { contentId: qna5.id, tagId: tags['Tauhid'].id },
    { contentId: qna6.id, tagId: tags['Ibadah'].id },
    { contentId: art1.id, tagId: tags['Adab'].id },
    { contentId: art1.id, tagId: tags['Akhlak'].id },
    { contentId: art2.id, tagId: tags['Kisah Nabi'].id },
    { contentId: art3.id, tagId: tags['Doa'].id },
    { contentId: art4.id, tagId: tags['Ibadah'].id },
    { contentId: art5.id, tagId: tags['Kisah Nabi'].id },
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
    create: { authorId: editor.id, totalPublished: 6, totalViews: 1335, totalLikes: 423, avgContentRating: 4.87 },
  });
  await prisma.authorStat.upsert({
    where: { authorId: admin.id },
    update: {},
    create: { authorId: admin.id, totalPublished: 4, totalViews: 709, totalLikes: 233, avgContentRating: 4.8 },
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
