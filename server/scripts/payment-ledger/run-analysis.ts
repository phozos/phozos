import { db } from '../../db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AnalysisResult {
  queryName: string;
  data: any[];
  executionTime: number;
}

async function runQuery(queryName: string, queryText: string): Promise<AnalysisResult> {
  const startTime = Date.now();
  try {
    const result = await db.execute(sql.raw(queryText));
    const executionTime = Date.now() - startTime;
    return {
      queryName,
      data: result.rows as any[],
      executionTime
    };
  } catch (error) {
    console.error(`Error executing ${queryName}:`, error);
    throw error;
  }
}

function formatDataAsTable(data: any[]): string {
  if (data.length === 0) {
    return 'No data returned\n';
  }
  
  const headers = Object.keys(data[0]);
  const columnWidths = headers.map(header => {
    const maxDataWidth = Math.max(
      ...data.map(row => String(row[header] || '').length)
    );
    return Math.max(header.length, maxDataWidth, 10);
  });
  
  let table = '';
  
  // Header row
  table += '| ' + headers.map((h, i) => h.padEnd(columnWidths[i])).join(' | ') + ' |\n';
  
  // Separator row
  table += '|' + columnWidths.map(w => '-'.repeat(w + 2)).join('|') + '|\n';
  
  // Data rows (limit to 50 rows for readability)
  const displayData = data.slice(0, 50);
  for (const row of displayData) {
    table += '| ' + headers.map((h, i) => 
      String(row[h] || '').padEnd(columnWidths[i])
    ).join(' | ') + ' |\n';
  }
  
  if (data.length > 50) {
    table += `\n*Showing 50 of ${data.length} rows*\n`;
  }
  
  return table + '\n';
}

function generateMarkdownReport(results: AnalysisResult[]): string {
  const timestamp = new Date().toISOString();
  let markdown = `# Payment Tracking Analysis Report\n\n`;
  markdown += `**Generated**: ${timestamp}\n`;
  markdown += `**Purpose**: Data analysis for payment ledger migration\n\n`;
  markdown += `---\n\n`;
  
  for (const result of results) {
    markdown += `## ${result.queryName.replace(/_/g, ' ')}\n\n`;
    markdown += `**Execution Time**: ${result.executionTime}ms\n`;
    markdown += `**Rows Returned**: ${result.data.length}\n\n`;
    
    if (result.data.length > 0) {
      markdown += '### Results\n\n';
      markdown += formatDataAsTable(result.data);
    } else {
      markdown += '*No data found*\n\n';
    }
    
    markdown += '---\n\n';
  }
  
  return markdown;
}

function generateSummary(results: AnalysisResult[]): string {
  let summary = '\n========================================\n';
  summary += '  PAYMENT TRACKING ANALYSIS SUMMARY\n';
  summary += '========================================\n\n';
  
  const usersWithGap = results.find(r => r.queryName.includes('MULTIPLE_PAYMENT_EVENTS'));
  const revenueGap = results.find(r => r.queryName.includes('REVENUE_GAP'));
  const metadataCoverage = results.find(r => r.queryName.includes('METADATA_COVERAGE'));
  const duplicates = results.find(r => r.queryName.includes('DUPLICATE_PAYMENT'));
  const paymentTypes = results.find(r => r.queryName.includes('PAYMENT_TYPE'));
  
  if (usersWithGap && usersWithGap.data.length > 0) {
    summary += `⚠️  CRITICAL FINDINGS:\n`;
    summary += `   - ${usersWithGap.data.length} users have multiple payment events\n`;
    const totalGap = usersWithGap.data.reduce((sum, row) => sum + (parseFloat(row.revenue_gap) || 0), 0);
    summary += `   - Total revenue gap: ₹${totalGap.toFixed(2)}\n\n`;
  }
  
  if (revenueGap && revenueGap.data.length > 0) {
    const gap = revenueGap.data[0];
    summary += `📊 REVENUE ANALYSIS:\n`;
    summary += `   - Reported revenue: ₹${parseFloat(gap.total_reported_revenue || 0).toFixed(2)}\n`;
    summary += `   - Actual revenue: ₹${parseFloat(gap.total_actual_revenue || 0).toFixed(2)}\n`;
    summary += `   - Gap: ₹${parseFloat(gap.revenue_gap || 0).toFixed(2)} (${gap.revenue_gap_percentage}%)\n\n`;
  }
  
  if (metadataCoverage && metadataCoverage.data.length > 0) {
    summary += `✅ METADATA COVERAGE:\n`;
    for (const row of metadataCoverage.data) {
      summary += `   - ${row.event_type}: ${row.metadata_coverage_pct}% coverage (${row.has_amount_paid}/${row.total_events} events)\n`;
    }
    summary += '\n';
  }
  
  if (paymentTypes && paymentTypes.data.length > 0) {
    summary += `📈 PAYMENT TYPE DISTRIBUTION:\n`;
    for (const row of paymentTypes.data) {
      summary += `   - ${row.payment_type}: ${row.event_count} payments, ₹${parseFloat(row.total_amount_rupees || 0).toFixed(2)} total\n`;
    }
    summary += '\n';
  }
  
  if (duplicates && duplicates.data.length > 0) {
    summary += `⚠️  WARNING: ${duplicates.data.length} duplicate payment references detected\n\n`;
  } else {
    summary += `✅ No duplicate payment references found\n\n`;
  }
  
  summary += '========================================\n\n';
  return summary;
}

async function main() {
  console.log('🔍 Starting Payment Tracking Analysis...\n');
  
  try {
    const analyses = [
      {
        name: 'USERS_WITH_MULTIPLE_PAYMENT_EVENTS',
        query: `
          WITH user_payment_counts AS (
            SELECT 
              se.user_id,
              u.email,
              u.first_name,
              u.last_name,
              COUNT(DISTINCT se.id) FILTER (WHERE se.event_type IN ('subscription_created', 'subscription_upgraded')) as payment_event_count,
              COUNT(DISTINCT us.id) as subscription_count,
              MAX(us.amount_paid) as current_amount_paid,
              COALESCE(
                SUM(CAST(se.metadata->>'amountPaid' AS NUMERIC)) FILTER (WHERE se.event_type IN ('subscription_created', 'subscription_upgraded')),
                0
              ) / 100 as total_actual_payments
            FROM subscription_events se
            JOIN users u ON se.user_id = u.id
            LEFT JOIN user_subscriptions us ON se.user_id = us.user_id
            WHERE se.event_type IN ('subscription_created', 'subscription_upgraded')
            GROUP BY se.user_id, u.email, u.first_name, u.last_name
          )
          SELECT 
            user_id,
            email,
            COALESCE(first_name || ' ' || last_name, email) as user_name,
            payment_event_count,
            subscription_count,
            current_amount_paid as reported_revenue,
            total_actual_payments as actual_revenue,
            (total_actual_payments - COALESCE(current_amount_paid, 0)) as revenue_gap
          FROM user_payment_counts
          WHERE payment_event_count > 1
          ORDER BY revenue_gap DESC
        `
      },
      {
        name: 'REVENUE_GAP_CALCULATION',
        query: `
          WITH revenue_summary AS (
            SELECT 
              SUM(COALESCE(us.amount_paid, 0)) as total_reported_revenue,
              SUM(CAST(se.metadata->>'amountPaid' AS NUMERIC)) / 100 as total_actual_revenue
            FROM subscription_events se
            LEFT JOIN user_subscriptions us ON se.user_id = us.user_id
            WHERE se.event_type IN ('subscription_created', 'subscription_upgraded')
          )
          SELECT 
            total_reported_revenue,
            total_actual_revenue,
            (total_actual_revenue - total_reported_revenue) as revenue_gap,
            CASE 
              WHEN total_reported_revenue > 0 
              THEN ROUND(((total_actual_revenue - total_reported_revenue) / total_reported_revenue * 100)::numeric, 2)
              ELSE 0 
            END as revenue_gap_percentage
          FROM revenue_summary
        `
      },
      {
        name: 'METADATA_COVERAGE_VERIFICATION',
        query: `
          SELECT 
            event_type,
            COUNT(*) as total_events,
            COUNT(*) FILTER (WHERE metadata->>'amountPaid' IS NOT NULL) as has_amount_paid,
            COUNT(*) FILTER (WHERE metadata->>'orderId' IS NOT NULL) as has_order_id,
            COUNT(*) FILTER (WHERE metadata->>'paymentId' IS NOT NULL) as has_payment_id,
            COUNT(*) FILTER (WHERE metadata->>'currency' IS NOT NULL) as has_currency,
            ROUND(
              (COUNT(*) FILTER (WHERE metadata->>'amountPaid' IS NOT NULL)::numeric / COUNT(*) * 100)::numeric, 
              2
            ) as metadata_coverage_pct
          FROM subscription_events
          WHERE event_type IN ('subscription_created', 'subscription_upgraded')
          GROUP BY event_type
          ORDER BY event_type
        `
      },
      {
        name: 'PAYMENT_EVENT_HISTORY',
        query: `
          SELECT 
            u.email,
            COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_name,
            se.event_type,
            CAST(se.metadata->>'amountPaid' AS NUMERIC) / 100 as amount_paid_rupees,
            se.metadata->>'currency' as currency,
            se.metadata->>'orderId' as order_id,
            se.metadata->>'paymentId' as payment_id,
            CASE 
              WHEN se.event_type = 'subscription_created' THEN se.metadata->>'planName'
              WHEN se.event_type = 'subscription_upgraded' THEN 
                (SELECT name FROM subscription_plans WHERE id = CAST(se.metadata->>'newPlanId' AS UUID))
              ELSE NULL
            END as plan_name,
            se.created_at as payment_date
          FROM subscription_events se
          JOIN users u ON se.user_id = u.id
          WHERE se.event_type IN ('subscription_created', 'subscription_upgraded')
          ORDER BY u.email, se.created_at
        `
      },
      {
        name: 'BEFORE_AFTER_REVENUE_REPORT',
        query: `
          WITH current_state AS (
            SELECT 
              'Current (user_subscriptions.amount_paid)' as source,
              SUM(COALESCE(amount_paid, 0)) as total_revenue,
              COUNT(DISTINCT user_id) as unique_users,
              COUNT(*) as total_records
            FROM user_subscriptions
            WHERE status = 'active'
          ),
          future_state AS (
            SELECT 
              'After Fix (subscription_events.metadata)' as source,
              SUM(CAST(metadata->>'amountPaid' AS NUMERIC)) / 100 as total_revenue,
              COUNT(DISTINCT user_id) as unique_users,
              COUNT(*) as total_records
            FROM subscription_events
            WHERE event_type IN ('subscription_created', 'subscription_upgraded')
          )
          SELECT * FROM current_state
          UNION ALL
          SELECT * FROM future_state
        `
      },
      {
        name: 'DUPLICATE_PAYMENT_DETECTION',
        query: `
          WITH payment_refs AS (
            SELECT 
              se.metadata->>'orderId' as order_id,
              se.metadata->>'paymentId' as payment_id,
              COUNT(*) as occurrence_count
            FROM subscription_events se
            WHERE se.event_type IN ('subscription_created', 'subscription_upgraded')
              AND se.metadata->>'orderId' IS NOT NULL
            GROUP BY se.metadata->>'orderId', se.metadata->>'paymentId'
            HAVING COUNT(*) > 1
          )
          SELECT 
            order_id,
            payment_id,
            occurrence_count,
            'DUPLICATE DETECTED' as status
          FROM payment_refs
        `
      },
      {
        name: 'PAYMENT_TYPE_DISTRIBUTION',
        query: `
          SELECT 
            CASE 
              WHEN event_type = 'subscription_created' THEN 'new_subscription'
              WHEN event_type = 'subscription_upgraded' THEN 'upgrade'
              ELSE 'unknown'
            END as payment_type,
            COUNT(*) as event_count,
            SUM(CAST(metadata->>'amountPaid' AS NUMERIC)) / 100 as total_amount_rupees,
            AVG(CAST(metadata->>'amountPaid' AS NUMERIC)) / 100 as avg_amount_rupees,
            MIN(created_at) as earliest_payment,
            MAX(created_at) as latest_payment
          FROM subscription_events
          WHERE event_type IN ('subscription_created', 'subscription_upgraded')
          GROUP BY event_type
          ORDER BY payment_type
        `
      }
    ];
    
    console.log(`📝 Running ${analyses.length} analysis queries\n`);
    
    const results: AnalysisResult[] = [];
    for (const analysis of analyses) {
      console.log(`⏳ Running: ${analysis.name}...`);
      const result = await runQuery(analysis.name, analysis.query);
      results.push(result);
      console.log(`✅ Complete (${result.executionTime}ms, ${result.data.length} rows)\n`);
    }
    
    // Generate reports
    const markdown = generateMarkdownReport(results);
    const summary = generateSummary(results);
    
    // Save markdown report
    const reportDir = path.join(__dirname, '..', '..', '..', 'docs', 'payments');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportPath = path.join(reportDir, 'analysis-report.md');
    fs.writeFileSync(reportPath, markdown);
    console.log(`📄 Report saved to: ${reportPath}`);
    
    // Print summary to console
    console.log(summary);
    
    console.log('✅ Phase 1 Analysis complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

main();
