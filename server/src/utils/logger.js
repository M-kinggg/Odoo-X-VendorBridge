import { supabaseAdmin } from '../config/supabase.js';

export const logActivity = async (userId, action, entityType, entityId, description) => {
  try {
    const timestamp = new Date().toISOString();
    
    const { error } = await supabaseAdmin.from('activity_logs').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      description,
      created_at: timestamp
    });

    if (error) {
      console.error('Failed to save activity log in Supabase:', error.message);
    } else {
      console.log(`📝 [Activity Log] ${action} on ${entityType} ID: ${entityId} - ${description}`);
    }
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};
