import { supabasePublic, supabaseAdmin } from '../config/supabase.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is missing' });
  }

  try {
    // Verify token using supabasePublic client (authenticates session)
    const { data: { user }, error: authError } = await supabasePublic.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(403).json({ message: 'Invalid or expired auth session' });
    }

    // Fetch custom user profile using supabaseAdmin (bypasses potential RLS on profile lookups)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role, name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ message: 'User profile not found or role not assigned' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: profile.role,
      name: profile.name
    };
    
    next();
  } catch (error) {
    console.error('Authentication Error:', error);
    return res.status(403).json({ message: 'Forbidden: Invalid or expired token' });
  }
};

export const authorizeRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Forbidden: Access requires one of these roles: ${allowedRoles.join(', ')} (Your role: ${req.user.role})` 
      });
    }

    next();
  };
};
