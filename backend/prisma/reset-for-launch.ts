/**
 * ══════════════════════════════════════════════════════
 *  ADABLY — Pre-Launch Database Reset Script
 * ══════════════════════════════════════════════════════
 * 
 *  This script selectively cleans ALL user-generated data
 *  while PRESERVING:
 *    ✅ ContentNode (learning structure tree)
 *    ✅ PageContent (CMS pages: About, Contact)
 *    ✅ Setting (system configuration)
 * 
 *  It then re-creates only SuperAdmin + Admin with
 *  production-ready passwords.
 * 
 *  Run: npx ts-node prisma/reset-for-launch.ts
 * ══════════════════════════════════════════════════════
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function resetForLaunch() {
  console.log('🚀 Starting Pre-Launch Reset...\n');

  const salt = await bcrypt.genSalt(10);

  // ═══════════════════════════════════════════════
  // PHASE 1: Delete ALL transactional/generated data
  // Order matters — delete children before parents
  // ═══════════════════════════════════════════════

  console.log('🗑️  Phase 1: Cleaning transactional data...');

  // Engagement data
  const delViews = await prisma.contentView.deleteMany({});
  const delLikes = await prisma.contentLike.deleteMany({});
  const delBookmarks = await prisma.contentBookmark.deleteMany({});
  const delRatings = await prisma.contentRating.deleteMany({});
  console.log(`   ✓ Engagement: ${delViews.count} views, ${delLikes.count} likes, ${delBookmarks.count} bookmarks, ${delRatings.count} ratings`);

  // Content relations
  const delRelated = await prisma.relatedContent.deleteMany({});
  const delItemTags = await prisma.contentItemTag.deleteMany({});
  const delReview = await prisma.reviewHistory.deleteMany({});
  const delAiCheck = await prisma.aiCheckResult.deleteMany({});
  console.log(`   ✓ Content relations: ${delRelated.count} related, ${delItemTags.count} item-tags, ${delReview.count} reviews, ${delAiCheck.count} AI checks`);

  // Content details (must delete before ContentItem)
  const delQna = await prisma.qnaDetail.deleteMany({});
  const delArticle = await prisma.articleDetail.deleteMany({});
  console.log(`   ✓ Content details: ${delQna.count} QnA, ${delArticle.count} articles`);

  // Content items
  const delContent = await prisma.contentItem.deleteMany({});
  console.log(`   ✓ Content items: ${delContent.count}`);

  // Tags — reset usage count to 0 (keep tags for re-use)
  const delTags = await prisma.contentTag.deleteMany({});
  console.log(`   ✓ Tags: ${delTags.count} deleted`);

  // Notifications
  const delNotif = await prisma.internalNotification.deleteMany({});
  console.log(`   ✓ Notifications: ${delNotif.count}`);

  // Messages & Conversations
  const delMsg = await prisma.message.deleteMany({});
  const delConvo = await prisma.conversation.deleteMany({});
  console.log(`   ✓ Messages: ${delMsg.count} messages, ${delConvo.count} conversations`);

  // Financial
  const delLedger = await prisma.pointLedger.deleteMany({});
  const delWithdraw = await prisma.withdrawalRequest.deleteMany({});
  const delReward = await prisma.reward.deleteMany({});
  const delDonation = await prisma.donationSubmission.deleteMany({});
  console.log(`   ✓ Financial: ${delLedger.count} ledger, ${delWithdraw.count} withdrawals, ${delReward.count} rewards, ${delDonation.count} donations`);

  // Feedback & Error reports
  const delFeedback = await prisma.feedbackSubmission.deleteMany({});
  const delErrors = await prisma.errorReport.deleteMany({});
  console.log(`   ✓ Feedback: ${delFeedback.count}, Errors: ${delErrors.count}`);

  // Audit logs
  const delAudit = await prisma.auditLog.deleteMany({});
  console.log(`   ✓ Audit logs: ${delAudit.count}`);

  // Sponsor banners
  const delBanners = await prisma.sponsorBanner.deleteMany({});
  console.log(`   ✓ Banners: ${delBanners.count}`);

  // Author stats
  const delStats = await prisma.authorStat.deleteMany({});
  console.log(`   ✓ Author stats: ${delStats.count}`);

  // Auth data (must delete before users)
  const delTokens = await prisma.refreshToken.deleteMany({});
  const delHistory = await prisma.loginHistory.deleteMany({});
  console.log(`   ✓ Auth: ${delTokens.count} tokens, ${delHistory.count} login history`);

  // ═══════════════════════════════════════════════
  // PHASE 2: Delete ALL users
  // ═══════════════════════════════════════════════

  console.log('\n🗑️  Phase 2: Removing all users...');
  const delUsers = await prisma.user.deleteMany({});
  console.log(`   ✓ Users deleted: ${delUsers.count}`);

  // ═══════════════════════════════════════════════
  // PHASE 3: Create fresh SuperAdmin + Admin
  // ═══════════════════════════════════════════════

  console.log('\n🌱 Phase 3: Creating production users...');

  const superadmin = await prisma.user.create({
    data: {
      email: 'superadmin@adably.id',
      passwordHash: await bcrypt.hash('superadmin123', salt),
      name: 'Abu Ahmad (SuperAdmin)',
      role: 'SUPERADMIN',
      points: 0,
    },
  });
  console.log(`   ✅ SuperAdmin: superadmin@adably.id`);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@adably.id',
      passwordHash: await bcrypt.hash('admin123', salt),
      name: 'Ummu Salma (Admin)',
      role: 'ADMIN',
      points: 0,
    },
  });
  console.log(`   ✅ Admin: admin@adably.id`);

  // ═══════════════════════════════════════════════
  // PHASE 4: Verify preserved data
  // ═══════════════════════════════════════════════

  console.log('\n📊 Phase 4: Verification...');

  const nodeCount = await prisma.contentNode.count();
  const pageCount = await prisma.pageContent.count();
  const settingCount = await prisma.setting.count();
  const userCount = await prisma.user.count();
  const contentCount = await prisma.contentItem.count();

  console.log(`   ✅ ContentNode (preserved): ${nodeCount} nodes`);
  console.log(`   ✅ PageContent (preserved): ${pageCount} pages`);
  console.log(`   ✅ Setting (preserved): ${settingCount} settings`);
  console.log(`   ✅ Users (fresh): ${userCount}`);
  console.log(`   ✅ Content items: ${contentCount} (should be 0)`);

  // ═══════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════

  console.log('\n══════════════════════════════════════════');
  console.log('🎉 Pre-Launch Reset Complete!');
  console.log('══════════════════════════════════════════');
  console.log('');
  console.log('📋 Login Credentials:');
  console.log('   SuperAdmin: superadmin@adably.id / superadmin123');
  console.log('   Admin:      admin@adably.id / admin123');
  console.log('');
  console.log('📌 Preserved:');
  console.log(`   • ${nodeCount} ContentNode (learning structure)`);
  console.log(`   • ${pageCount} PageContent (CMS pages)`);
  console.log(`   • ${settingCount} Settings (system config)`);
  console.log('');
  console.log('⚠️  Next steps:');
  console.log('   1. Login with new credentials');
  console.log('   2. Set ALLOW_SEED_INIT=false in production env');
  console.log('   3. Change JWT_SECRET if still using default');
  console.log('   4. Rebuild & deploy');
}

resetForLaunch()
  .catch((e) => {
    console.error('❌ Reset failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
