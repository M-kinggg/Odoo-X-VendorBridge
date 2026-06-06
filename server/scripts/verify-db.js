import { supabaseAdmin } from '../src/config/supabase.js';

const tables = [
  'users',
  'vendors',
  'rfqs',
  'rfq_items',
  'rfq_vendors',
  'quotations',
  'quotation_items',
  'approvals',
  'purchase_orders',
  'invoices',
  'activity_logs'
];

const verifyDb = async () => {
  console.log('🔍 Starting Supabase Real Data Verification...\n');
  let overallPass = true;

  for (const table of tables) {
    try {
      // Query count and select ID columns to verify no mock data
      const { data, count, error } = await supabaseAdmin
        .from(table)
        .select('id', { count: 'exact' });

      if (error) {
        console.log(`❌ Table "${table}": FAIL (Error: ${error.message})`);
        overallPass = false;
        continue;
      }

      // Check for 'mock' in IDs
      const hasMockId = (data || []).some(row => typeof row.id === 'string' && row.id.toLowerCase().includes('mock'));

      if (hasMockId) {
        console.log(`❌ Table "${table}": FAIL (Contains mock UUIDs, Count: ${count})`);
        overallPass = false;
      } else {
        console.log(`✅ Table "${table}": PASS (Count: ${count}, No mock UUIDs detected)`);
      }
    } catch (err) {
      console.log(`❌ Table "${table}": FAIL (Exception: ${err.message})`);
      overallPass = false;
    }
  }

  console.log('\n⏳ Fetching 3 most recent activity logs...');
  try {
    const { data: logs, error } = await supabaseAdmin
      .from('activity_logs')
      .select('id, action, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) {
      console.log(`❌ Failed to fetch recent logs: ${error.message}`);
    } else {
      logs.forEach((log, index) => {
        console.log(`  [Log ${index + 1}] ID: ${log.id} | Action: ${log.action} | Created At: ${log.created_at}`);
      });
    }
  } catch (err) {
    console.log(`❌ Exception fetching recent logs: ${err.message}`);
  }

  if (overallPass) {
    console.log('\n🎉 ALL TABLES VERIFIED: PASS');
    process.exit(0);
  } else {
    console.log('\n❌ DATABASE VERIFICATION FAILED: FAIL');
    process.exit(1);
  }
};

verifyDb();
