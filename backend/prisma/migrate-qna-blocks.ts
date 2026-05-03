/**
 * QnaDetail Data Migration Script — Phase 1
 * Converts legacy separate block fields (dialogBlocks, dalilBlocks, analogyBlocks, tipsBlocks)
 * into the new unified blocks[] array.
 *
 * Run ONCE after deploying the schema change:
 *   npx ts-node prisma/migrate-qna-blocks.ts
 *
 * Safe to run multiple times (idempotent — skips records where blocks already populated).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting QnaDetail block migration...');

  const allQna = await prisma.qnaDetail.findMany({
    select: {
      id: true,
      contentId: true,
      blocks: true,
      dialogBlocks: true,
      dalilBlocks: true,
      analogyBlocks: true,
      tipsBlocks: true,
    },
  });

  console.log(`📋 Found ${allQna.length} QnaDetail records.`);

  let migrated = 0;
  let skipped = 0;

  for (const qna of allQna) {
    // Idempotent: skip if blocks already has content
    const existingBlocks = qna.blocks as any[];
    if (Array.isArray(existingBlocks) && existingBlocks.length > 0) {
      skipped++;
      continue;
    }

    const blocks: any[] = [];

    // Convert dialogBlocks
    const dialogs = (qna.dialogBlocks as any[]) || [];
    for (const d of dialogs) {
      const lines = d.lines || [{ role: d.role || 'anak', text: d.text || '' }];
      blocks.push({ type: 'dialog', lines });
    }

    // Convert dalilBlocks
    const dalils = (qna.dalilBlocks as any[]) || [];
    for (const d of dalils) {
      const entries = d.entries || [{ arabic: d.arabic || '', translation: d.translation || '', source: d.source || '', sourceUrl: d.sourceUrl || '' }];
      blocks.push({ type: 'dalil', entries });
    }

    // Convert analogyBlocks
    const analogies = (qna.analogyBlocks as any[]) || [];
    for (const a of analogies) {
      blocks.push({ type: 'analogy', title: a.title || '', text: a.text || '' });
    }

    // Convert tipsBlocks
    const tips = (qna.tipsBlocks as any[]) || [];
    for (const t of tips) {
      blocks.push({ type: 'tip', text: t.text || '', referenceUrl: t.referenceUrl || '' });
    }

    await prisma.qnaDetail.update({
      where: { id: qna.id },
      data: { blocks },
    });

    migrated++;
    console.log(`  ✅ Migrated contentId: ${qna.contentId} (${blocks.length} blocks)`);
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   Migrated: ${migrated} records`);
  console.log(`   Skipped (already migrated): ${skipped} records`);
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
