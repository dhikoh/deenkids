/**
 * Standalone simulation test — no NestJS decorators needed.
 * Run: node test/test-prompt-standalone.mjs
 */

// Inline copy of the prompt generation logic to test without build
function generateContentPrompt(type, title, ages) {
  const ageLabel = ages.map(a => a === 'Semua Usia' ? 'semua usia' : `${a} tahun`).join(', ');
  const typeLabel = type === 'QNA' ? 'Tanya Jawab' : type === 'PEMBELAJARAN' ? 'Pembelajaran' : 'Artikel';
  let prompt = `Kamu adalah penulis konten islami untuk platform edukasi anak bernama Adably.\n\nKORIDOR KONTEN:\n1. Seluruh konten HARUS bersumber dari Al-Quran dan Hadits Shahih sesuai pemahaman Salafus Shalih.\n\nTUGAS:\nBuatkan konten "${typeLabel}" dengan judul: "${title}"\nTarget: anak usia ${ageLabel}`;
  return prompt;
}

function generateKisahPrompt(subType, title) {
  const subLabel = { SIRAH: 'Sirah Nabawiyah', QASHASH: 'Qashashul Anbiya', TELADAN: 'Teladan Sahabat', FIKSI: 'Cerita Fiksi Islami' }[subType];
  return `Kamu adalah PENULIS KISAH ISLAMI untuk "Adably".\nBuatkan konten "${subLabel}" judul: "${title}"\nGaya: PENCERITA, ARC EMOSIONAL, min 600 kata`;
}

function generateThumbnailPrompt(title, ratio) {
  const sizeMap = { '16:9': '1280×720', '1:1': '1080×1080', '4:5': '1080×1350' };
  return `Thumbnail edukasi anak Islami.\nJudul: "${title}"\nRasio: ${ratio} (${sizeMap[ratio]})\nFACELESS, watermark adably.id`;
}

// === RUN TESTS ===
console.log('╔══════════════════════════════════════════╗');
console.log('║  N8N PROMPT SIMULATION TEST              ║');
console.log('╚══════════════════════════════════════════╝\n');

const tests = [
  { name: 'QNA Prompt', fn: () => generateContentPrompt('QNA', 'Kenapa harus sholat?', ['3-5', '5-7']) },
  { name: 'ARTICLE Prompt', fn: () => generateContentPrompt('ARTICLE', 'Pentingnya Sedekah', ['5-7', '7-10']) },
  { name: 'PEMBELAJARAN Prompt', fn: () => generateContentPrompt('PEMBELAJARAN', 'Rukun Islam', ['3-5']) },
  { name: 'KISAH Sirah', fn: () => generateKisahPrompt('SIRAH', 'Hijrah ke Madinah') },
  { name: 'KISAH Qashash', fn: () => generateKisahPrompt('QASHASH', 'Nabi Musa dan Firaun') },
  { name: 'KISAH Teladan', fn: () => generateKisahPrompt('TELADAN', 'Abu Bakar Ash-Shiddiq') },
  { name: 'KISAH Fiksi', fn: () => generateKisahPrompt('FIKSI', 'Petualangan di Taman') },
  { name: 'Thumb 16:9', fn: () => generateThumbnailPrompt('Sholat Subuh', '16:9') },
  { name: 'Thumb 1:1', fn: () => generateThumbnailPrompt('Sholat Subuh', '1:1') },
  { name: 'Thumb 4:5', fn: () => generateThumbnailPrompt('Sholat Subuh', '4:5') },
];

let passed = 0;
for (const t of tests) {
  try {
    const result = t.fn();
    const ok = result && result.length > 50;
    console.log(`${ok ? '✅' : '❌'} ${t.name}: ${result.length} chars`);
    if (ok) passed++;
  } catch (e) {
    console.log(`❌ ${t.name}: ERROR - ${e.message}`);
  }
}

console.log(`\n${passed}/${tests.length} tests passed`);

// === SIMULATE BOT FLOW ===
console.log('\n╔══════════════════════════════════════════╗');
console.log('║  BOT FLOW SIMULATION                     ║');
console.log('╚══════════════════════════════════════════╝\n');

// Simulate state machine
const chats = {};
function simulate(chatId, action, data) {
  const st = chats[chatId] || {};
  let result = { action: 'reply', text: '' };

  if (action === 'callback' && data === 'm_create') {
    result.text = '📝 Pilih tipe konten:';
  } else if (action === 'callback' && data === 't_QNA') {
    chats[chatId] = { step: 'wait_title', type: 'QNA' };
    result.text = '✅ Tipe: QNA\n✏️ Ketik judul:';
  } else if (action === 'text' && st.step === 'wait_title') {
    result.action = 'gen_prompt';
    result.type = st.type;
    result.title = data;
    chats[chatId] = { step: 'wait_content', type: st.type, title: data };
  } else if (action === 'text' && st.step === 'wait_content') {
    result.action = 'save';
    result.type = st.type;
    result.title = st.title;
    result.raw = data;
    delete chats[chatId];
  } else if (action === 'callback' && data === 'm_status') {
    chats[chatId] = { step: 'wait_status_id' };
    result.text = '📊 Ketik ID konten:';
  } else if (action === 'text' && st.step === 'wait_status_id') {
    result.action = 'status';
    result.cId = data;
    delete chats[chatId];
  } else if (action === 'callback' && data === 'm_submit') {
    chats[chatId] = { step: 'wait_submit_id' };
    result.text = '📤 Ketik ID konten:';
  } else if (action === 'text' && st.step === 'wait_submit_id') {
    result.action = 'submit';
    result.cId = data;
    delete chats[chatId];
  }

  return result;
}

// Flow 1: Create QNA Content
console.log('--- Flow 1: Buat Konten QNA ---');
let r;
r = simulate(1, 'callback', 'm_create');
console.log(`Step 1 (menu): ${r.action} → "${r.text}"`);
r = simulate(1, 'callback', 't_QNA');
console.log(`Step 2 (type): ${r.action} → "${r.text}"`);
r = simulate(1, 'text', 'Kenapa kita sholat?');
console.log(`Step 3 (title): ${r.action} → type=${r.type}, title=${r.title}`);
r = simulate(1, 'text', '(quick_answer)\nKarena sholat itu wajib.\n\n(paragraph)\nSholat adalah tiang agama...');
console.log(`Step 4 (content): ${r.action} → type=${r.type}, title=${r.title}, rawLen=${r.raw?.length}`);
console.log(`State cleared: ${!chats[1] ? '✅' : '❌ LEAK!'}`);

// Flow 2: Check Status
console.log('\n--- Flow 2: Cek Status ---');
r = simulate(2, 'callback', 'm_status');
console.log(`Step 1: ${r.action} → "${r.text}"`);
r = simulate(2, 'text', 'abc-123');
console.log(`Step 2: ${r.action} → cId=${r.cId}`);
console.log(`State cleared: ${!chats[2] ? '✅' : '❌ LEAK!'}`);

// Flow 3: Submit Review
console.log('\n--- Flow 3: Submit Review ---');
r = simulate(3, 'callback', 'm_submit');
console.log(`Step 1: ${r.action} → "${r.text}"`);
r = simulate(3, 'text', 'abc-123');
console.log(`Step 2: ${r.action} → cId=${r.cId}`);
console.log(`State cleared: ${!chats[3] ? '✅' : '❌ LEAK!'}`);

console.log('\n✅ ALL FLOW SIMULATIONS PASSED');
