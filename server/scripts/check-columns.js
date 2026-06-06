import { supabaseAdmin } from '../src/config/supabase.js';

async function check() {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(1);
      
    if (error) {
      console.error('Error fetching user:', error);
    } else {
      console.log('Columns in users table:', data && data.length > 0 ? Object.keys(data[0]) : 'No users found');
    }
    
    const { data: logs, error: logError } = await supabaseAdmin
      .from('activity_logs')
      .select('*')
      .limit(1);
      
    if (logError) {
      console.error('Error fetching logs:', logError);
    } else {
      console.log('Columns in activity_logs table:', logs && logs.length > 0 ? Object.keys(logs[0]) : 'No logs found');
    }
  } catch (err) {
    console.error('Script error:', err);
  }
  process.exit(0);
}

check();
