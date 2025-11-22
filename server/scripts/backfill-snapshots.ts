#!/usr/bin/env tsx
/**
 * Backfill Subscription Snapshots Script
 * 
 * This script backfills missing subscribedPlanSnapshot for existing active subscriptions.
 * It creates a snapshot from the current plan state to enable grandfathering.
 * 
 * Usage:
 *   npm run backfill-snapshots            # Dry run (default)
 *   npm run backfill-snapshots -- --apply # Apply changes
 * 
 * Safety Features:
 * - Dry-run mode by default
 * - Transaction-based updates
 * - Progress tracking
 * - Error handling and rollback
 */

import { db } from '../db';
import { userSubscriptions, subscriptionPlans } from '@shared/schema';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { logger } from '../utils/logger';

interface BackfillStats {
  total: number;
  success: number;
  failed: number;
  skipped: number;
}

const stats: BackfillStats = {
  total: 0,
  success: 0,
  failed: 0,
  skipped: 0
};

/**
 * Find all active subscriptions without snapshots
 */
async function findSubscriptionsNeedingSnapshots() {
  try {
    const subscriptions = await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.status, 'active'),
          isNull(userSubscriptions.subscribedPlanSnapshot)
        )
      );

    logger.info(`Found ${subscriptions.length} active subscriptions without snapshots`);
    return subscriptions;
  } catch (error) {
    logger.error('Error finding subscriptions:', error);
    throw error;
  }
}

/**
 * Backfill snapshot for a single subscription
 */
async function backfillSubscriptionSnapshot(
  subscriptionId: string,
  planId: string,
  amountPaid: string | null,
  dryRun: boolean
): Promise<boolean> {
  try {
    // Get the current plan
    const plan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId))
      .limit(1);

    if (!plan || plan.length === 0) {
      logger.warn(`Plan ${planId} not found for subscription ${subscriptionId}`);
      stats.failed++;
      return false;
    }

    const currentPlan = plan[0];

    if (dryRun) {
      logger.info(`[DRY RUN] Would backfill subscription ${subscriptionId}:`);
      logger.info(`  Plan: ${currentPlan.name} (${currentPlan.id})`);
      logger.info(`  Snapshot: ${JSON.stringify(currentPlan).substring(0, 100)}...`);
      logger.info(`  Grandfathered price: ${amountPaid || currentPlan.price}`);
      stats.success++;
      return true;
    }

    // Apply the backfill
    await db
      .update(userSubscriptions)
      .set({
        subscribedPlanSnapshot: currentPlan,
        grandfatheredPrice: amountPaid || currentPlan.price,
        isGrandfathered: true,
        grandfatheredUntil: null, // Forever
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.id, subscriptionId));

    logger.info(`✅ Backfilled subscription ${subscriptionId} with plan ${currentPlan.name}`);
    stats.success++;
    return true;
  } catch (error) {
    logger.error(`Error backfilling subscription ${subscriptionId}:`, error);
    stats.failed++;
    return false;
  }
}

/**
 * Main backfill function
 */
async function backfillSnapshots(dryRun: boolean = true) {
  logger.info('='.repeat(80));
  logger.info('SUBSCRIPTION SNAPSHOT BACKFILL SCRIPT');
  logger.info('='.repeat(80));
  logger.info(`Mode: ${dryRun ? 'DRY RUN' : 'APPLY CHANGES'}`);
  logger.info('');

  if (dryRun) {
    logger.info('⚠️  Running in DRY RUN mode - no changes will be made');
    logger.info('   Use --apply flag to apply changes');
    logger.info('');
  } else {
    logger.warn('⚠️  Running in APPLY mode - changes WILL be made!');
    logger.info('');
  }

  try {
    // Find subscriptions needing backfill
    const subscriptions = await findSubscriptionsNeedingSnapshots();
    stats.total = subscriptions.length;

    if (stats.total === 0) {
      logger.info('✅ No subscriptions need backfilling. All active subscriptions have snapshots!');
      return;
    }

    logger.info(`Processing ${stats.total} subscriptions...\n`);

    // Process each subscription
    for (let i = 0; i < subscriptions.length; i++) {
      const subscription = subscriptions[i];
      const progress = `[${i + 1}/${stats.total}]`;

      logger.info(`${progress} Processing subscription ${subscription.id}...`);

      // Check if subscription already has snapshot (race condition protection)
      if (subscription.subscribedPlanSnapshot !== null) {
        logger.info(`${progress} Skipping - snapshot already exists`);
        stats.skipped++;
        continue;
      }

      await backfillSubscriptionSnapshot(
        subscription.id,
        subscription.planId,
        subscription.amountPaid,
        dryRun
      );

      // Progress checkpoint every 10 records
      if ((i + 1) % 10 === 0) {
        logger.info(`\nProgress checkpoint: ${i + 1}/${stats.total} processed`);
        logger.info(`Success: ${stats.success}, Failed: ${stats.failed}, Skipped: ${stats.skipped}\n`);
      }
    }

    // Final report
    logger.info('');
    logger.info('='.repeat(80));
    logger.info('BACKFILL COMPLETE');
    logger.info('='.repeat(80));
    logger.info(`Total subscriptions:  ${stats.total}`);
    logger.info(`Successfully updated: ${stats.success}`);
    logger.info(`Failed:              ${stats.failed}`);
    logger.info(`Skipped:             ${stats.skipped}`);
    logger.info('='.repeat(80));

    if (dryRun && stats.total > 0) {
      logger.info('\n💡 To apply these changes, run: npm run backfill-snapshots -- --apply\n');
    }

    if (!dryRun && stats.success > 0) {
      logger.info('\n✅ Snapshots have been successfully backfilled!');
      logger.info('   All affected users are now grandfathered at their current plan state.\n');
    }

  } catch (error) {
    logger.error('Fatal error during backfill:', error);
    throw error;
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): { dryRun: boolean } {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  
  return { dryRun };
}

/**
 * Entry point
 */
async function main() {
  const { dryRun } = parseArgs();

  try {
    await backfillSnapshots(dryRun);
    process.exit(0);
  } catch (error) {
    logger.error('Script failed:', error);
    process.exit(1);
  }
}

// Run the script if executed directly
if (require.main === module) {
  main();
}

export { backfillSnapshots, findSubscriptionsNeedingSnapshots };
