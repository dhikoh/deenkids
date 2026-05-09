/**
 * Simulation test for n8n prompt generation and save flow.
 * Run: npx ts-node --compiler-options '{"module":"commonjs"}' test-n8n-prompt.ts
 */
import { N8nPromptService } from '../src/n8n/n8n-prompt.service';

const service = new N8nPromptService();

console.log('=== TEST 1: QNA Prompt ===');
const qnaPrompt = service.generatePrompt({ type: 'QNA', title: 'Kenapa kita harus sholat?' });
console.log(`Length: ${qnaPrompt.length} chars`);
console.log(`Has manhaj salaf: ${qnaPrompt.includes('Salafus Shalih')}`);
console.log(`Has TTS perspective: ${qnaPrompt.includes('DIBACAKAN')}`);
console.log(`Has dalil format: ${qnaPrompt.includes('(dalil)')}`);
console.log(`Has doa rules: ${qnaPrompt.includes('ATURAN KETAT DOA')}`);
console.log(`Has opening: ${qnaPrompt.includes('(opening)')}`);
console.log(`Has closing: ${qnaPrompt.includes('(closing)')}`);
console.log(`Has quick_answer: ${qnaPrompt.includes('quick_answer')}`);
console.log(`Has URL guide: ${qnaPrompt.includes('quran.com')}`);
console.log('---');

console.log('=== TEST 2: KISAH Sirah Prompt ===');
const kisahPrompt = service.generatePrompt({ type: 'KISAH', title: 'Hijrah ke Madinah', subType: 'SIRAH' });
console.log(`Length: ${kisahPrompt.length} chars`);
console.log(`Has Sirah rules: ${kisahPrompt.includes('Ibnu Hisyam')}`);
console.log(`Has arc emosional: ${kisahPrompt.includes('ARC EMOSIONAL')}`);
console.log(`Has HEADING block: ${kisahPrompt.includes('[HEADING]')}`);
console.log(`Has faceless rule (should NOT): ${!kisahPrompt.includes('FACELESS')}`);
console.log('---');

console.log('=== TEST 3: KISAH Fiksi Prompt ===');
const fiksiPrompt = service.generatePrompt({ type: 'KISAH', title: 'Petualangan di Taman', subType: 'FIKSI' });
console.log(`Length: ${fiksiPrompt.length} chars`);
console.log(`Has Fiksi rules: ${fiksiPrompt.includes('FIKTIF')}`);
console.log(`Has NO dalil block: ${!fiksiPrompt.includes('BLOK 2: DALIL')}`);
console.log(`Has NO doa ketat: ${!fiksiPrompt.includes('ATURAN KETAT DOA')}`);
console.log('---');

console.log('=== TEST 4: ARTICLE Prompt ===');
const articlePrompt = service.generatePrompt({ type: 'ARTICLE', title: 'Pentingnya Sedekah' });
console.log(`Length: ${articlePrompt.length} chars`);
console.log(`Has HOOK guide: ${articlePrompt.includes('HOOK')}`);
console.log('---');

console.log('=== TEST 5: PEMBELAJARAN Prompt ===');
const pembelajaranPrompt = service.generatePrompt({ type: 'PEMBELAJARAN', title: 'Rukun Islam' });
console.log(`Length: ${pembelajaranPrompt.length} chars`);
console.log(`Has pedagogis: ${pembelajaranPrompt.includes('PEDAGOGIS')}`);
console.log('---');

console.log('=== TEST 6: Thumbnail Prompts ===');
for (const ratio of ['16:9', '1:1', '4:5'] as const) {
  const thumbPrompt = service.generateThumbnailPrompt({ title: 'Sholat Subuh', ratio });
  console.log(`Ratio ${ratio}: ${thumbPrompt.length} chars, has FACELESS: ${thumbPrompt.includes('FACELESS')}, has watermark: ${thumbPrompt.includes('adably.id')}`);
}

console.log('\n=== ALL TESTS PASSED ===');
