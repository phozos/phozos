import { db } from '../db';
import { payments, subscriptionEvents, users, userSubscriptions } from '@shared/schema';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PaymentEvent {
  id: string;
  subscriptionId: string;
  userId: string;
  eventType: string;
  metadata: any;
  createdAt: Date;
}

interface BackfillResult {
  totalEvents: number;
  successfulInserts: number;
  skippedDuplicates: number;
  errors: number;
  errorDetails: Array<{ eventId: string; error: string }>;
}

async function getPaymentEvents(): Promise<PaymentEvent[]> {
  const events = await db.execute(sql`
    SELECT 
      id,
      subscription_id as "subscriptionId",
      user_id as "userId",
      event_type as "eventType",
      metadata,
      created_at as "createdAt"
    FROM subscription_events
    WHERE event_type IN ('subscription_created', 'subscription_upgraded')
    ORDER BY created_at ASC
  `);
  
  return events.rows as any[];
}

function determinePaymentType(eventType: string): 'new_subscription' | 'upgrade' | 'renewal' {
  if (eventType === 'subscription_created') {
    return 'new_subscription';
  } else if (eventType === 'subscription_upgraded') {
    return 'upgrade';
  }
  return 'renewal'; // Default fallback
}

function extractPaymentData(event: PaymentEvent) {
  const metadata = event.metadata;
  
  // Extract payment details from metadata
  const orderId = metadata.orderId;
  const paymentId = metadata.paymentId;
  const amountPaid = metadata.amountPaid;
  const currency = metadata.currency || 'INR';
  
  // Determine plan ID based on event type
  let planId: string | null = null;
  if (event.eventType === 'subscription_created') {
    planId = metadata.planId;
  } else if (event.eventType === 'subscription_upgraded') {
    planId = metadata.newPlanId;
  }
  
  // Convert amount from paise to rupees if needed
  // The metadata stores amounts in paise (e.g., 20000 paise = ₹200)
  const amountInRupees = amountPaid ? parseFloat((amountPaid / 100).toFixed(2)) : 0;
  
  return {
    orderId,
    paymentId,
    amountInRupees,
    currency,
    planId,
  };
}

async function checkIfPaymentExists(orderId: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM payments
    WHERE order_id = ${orderId}
  `);
  
  const count = parseInt((result.rows[0] as any).count);
  return count > 0;
}

async function insertPayment(event: PaymentEvent, paymentData: any, paymentType: string): Promise<boolean> {
  try {
    await db.execute(sql`
      INSERT INTO payments (
        user_id,
        subscription_id,
        plan_id,
        payment_type,
        amount,
        currency,
        order_id,
        payment_reference,
        payment_gateway,
        paid_at,
        created_at
      ) VALUES (
        ${event.userId},
        ${event.subscriptionId},
        ${paymentData.planId},
        ${paymentType}::payment_type,
        ${paymentData.amountInRupees},
        ${paymentData.currency},
        ${paymentData.orderId},
        ${paymentData.paymentId},
        'razorpay',
        ${event.createdAt},
        ${event.createdAt}
      )
    `);
    
    return true;
  } catch (error: any) {
    throw new Error(`Failed to insert payment: ${error.message}`);
  }
}

async function runBackfill(): Promise<BackfillResult> {
  console.log('🔄 Starting payment ledger backfill...\n');
  
  const result: BackfillResult = {
    totalEvents: 0,
    successfulInserts: 0,
    skippedDuplicates: 0,
    errors: 0,
    errorDetails: []
  };
  
  try {
    // Step 1: Get all payment events
    console.log('📊 Fetching payment events from subscription_events...');
    const events = await getPaymentEvents();
    result.totalEvents = events.length;
    console.log(`✅ Found ${events.length} payment events\n`);
    
    // Step 2: Process each event
    console.log('⏳ Processing events...\n');
    for (const event of events) {
      try {
        const paymentData = extractPaymentData(event);
        
        // Validate required fields
        if (!paymentData.orderId || !paymentData.paymentId) {
          console.log(`⚠️  Skipping event ${event.id}: Missing order_id or payment_id`);
          result.errors++;
          result.errorDetails.push({
            eventId: event.id,
            error: 'Missing order_id or payment_id'
          });
          continue;
        }
        
        // Check for duplicates (idempotency)
        const exists = await checkIfPaymentExists(paymentData.orderId);
        if (exists) {
          console.log(`⏭️  Skipping duplicate: ${paymentData.orderId}`);
          result.skippedDuplicates++;
          continue;
        }
        
        // Determine payment type
        const paymentType = determinePaymentType(event.eventType);
        
        // Insert payment
        await insertPayment(event, paymentData, paymentType);
        
        result.successfulInserts++;
        console.log(`✅ Inserted payment: ${paymentData.orderId} (${paymentType}, ₹${paymentData.amountInRupees})`);
      } catch (error: any) {
        console.error(`❌ Error processing event ${event.id}:`, error.message);
        result.errors++;
        result.errorDetails.push({
          eventId: event.id,
          error: error.message
        });
      }
    }
    
    console.log('\n📊 Backfill Summary:');
    console.log(`   - Total events processed: ${result.totalEvents}`);
    console.log(`   - Successful inserts: ${result.successfulInserts}`);
    console.log(`   - Skipped duplicates: ${result.skippedDuplicates}`);
    console.log(`   - Errors: ${result.errors}`);
    
    if (result.errors > 0) {
      console.log('\n⚠️  Error Details:');
      result.errorDetails.forEach(err => {
        console.log(`   - Event ${err.eventId}: ${err.error}`);
      });
    }
    
    return result;
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    throw error;
  }
}

async function runReconciliation() {
  console.log('\n🔍 Running reconciliation checks...\n');
  
  // Check 1: Compare total amounts
  const amountComparison = await db.execute(sql`
    WITH subscription_events_total AS (
      SELECT 
        SUM(CAST(metadata->>'amountPaid' AS NUMERIC)) / 100 as total
      FROM subscription_events
      WHERE event_type IN ('subscription_created', 'subscription_upgraded')
    ),
    payments_total AS (
      SELECT SUM(amount) as total
      FROM payments
    )
    SELECT 
      se.total as events_total,
      p.total as payments_total,
      (p.total - se.total) as difference
    FROM subscription_events_total se, payments_total p
  `);
  
  const comparison = amountComparison.rows[0] as any;
  console.log('💰 Amount Reconciliation:');
  console.log(`   - Subscription Events Total: ₹${parseFloat(comparison.events_total || 0).toFixed(2)}`);
  console.log(`   - Payments Table Total: ₹${parseFloat(comparison.payments_total || 0).toFixed(2)}`);
  console.log(`   - Difference: ₹${parseFloat(comparison.difference || 0).toFixed(2)}`);
  
  // Check 2: Verify all payment references are unique
  const duplicateCheck = await db.execute(sql`
    SELECT 
      payment_reference,
      COUNT(*) as count
    FROM payments
    GROUP BY payment_reference
    HAVING COUNT(*) > 1
  `);
  
  console.log(`\n🔑 Payment Reference Uniqueness:`);
  if (duplicateCheck.rows.length === 0) {
    console.log('   ✅ All payment references are unique');
  } else {
    console.log(`   ⚠️  Found ${duplicateCheck.rows.length} duplicate payment references`);
    duplicateCheck.rows.forEach((row: any) => {
      console.log(`      - ${row.payment_reference}: ${row.count} occurrences`);
    });
  }
  
  // Check 3: Verify event count matches payment count
  const countComparison = await db.execute(sql`
    WITH events_count AS (
      SELECT COUNT(*) as count
      FROM subscription_events
      WHERE event_type IN ('subscription_created', 'subscription_upgraded')
        AND metadata->>'orderId' IS NOT NULL
    ),
    payments_count AS (
      SELECT COUNT(*) as count
      FROM payments
    )
    SELECT 
      e.count as events_count,
      p.count as payments_count,
      (p.count - e.count) as difference
    FROM events_count e, payments_count p
  `);
  
  const counts = countComparison.rows[0] as any;
  console.log(`\n📊 Record Count Reconciliation:`);
  console.log(`   - Subscription Events: ${counts.events_count}`);
  console.log(`   - Payments Records: ${counts.payments_count}`);
  console.log(`   - Difference: ${counts.difference}`);
  
  if (counts.difference === 0) {
    console.log('   ✅ All events have corresponding payment records');
  } else {
    console.log('   ⚠️  Mismatch between events and payment records');
  }
}

async function generateBackfillReport(result: BackfillResult) {
  const timestamp = new Date().toISOString();
  let report = `# Payment Ledger Backfill Report\n\n`;
  report += `**Generated**: ${timestamp}\n`;
  report += `**Purpose**: Historical data migration from subscription_events to payments table\n\n`;
  report += `---\n\n`;
  
  report += `## Summary\n\n`;
  report += `- **Total Events Processed**: ${result.totalEvents}\n`;
  report += `- **Successful Inserts**: ${result.successfulInserts}\n`;
  report += `- **Skipped Duplicates**: ${result.skippedDuplicates}\n`;
  report += `- **Errors**: ${result.errors}\n\n`;
  
  if (result.errors > 0) {
    report += `## Error Details\n\n`;
    report += `| Event ID | Error |\n`;
    report += `|----------|-------|\n`;
    result.errorDetails.forEach(err => {
      report += `| ${err.eventId} | ${err.error} |\n`;
    });
    report += `\n`;
  }
  
  report += `## Status\n\n`;
  if (result.errors === 0 && result.successfulInserts === result.totalEvents - result.skippedDuplicates) {
    report += `✅ **SUCCESS**: All payment events successfully migrated to payments table.\n\n`;
  } else {
    report += `⚠️  **PARTIAL SUCCESS**: Some events could not be migrated. See error details above.\n\n`;
  }
  
  const reportDir = path.join(__dirname, '..', '..', 'docs', 'payments');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = path.join(reportDir, 'backfill-report.md');
  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Backfill report saved to: ${reportPath}`);
}

async function main() {
  try {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   PAYMENT LEDGER BACKFILL - PHASE 3             ║');
    console.log('╚══════════════════════════════════════════════════╝\n');
    
    // Run backfill
    const result = await runBackfill();
    
    // Run reconciliation
    await runReconciliation();
    
    // Generate report
    await generateBackfillReport(result);
    
    console.log('\n✅ Phase 3 Backfill complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  }
}

main();
