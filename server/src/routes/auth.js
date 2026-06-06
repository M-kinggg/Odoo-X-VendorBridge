import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { supabasePublic, supabaseAdmin } from '../config/supabase.js';

const router = Router();

// Validation Rules
const signupRules = [
  body('email').isEmail().withMessage('Please enter a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('role').isIn(['admin', 'procurement_officer', 'manager', 'vendor']).withMessage('Invalid role selected')
];

const loginRules = [
  body('email').isEmail().withMessage('Please enter a valid email address'),
  body('password').notEmpty().withMessage('Password is required')
];

const forgotPasswordRules = [
  body('email').isEmail().withMessage('Please enter a valid email address')
];

// POST /api/auth/signup
router.post('/signup', signupRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, name, role } = req.body;

  try {
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    // 1. Create user in Supabase Auth using the admin client to bypass rate limits and auto-confirm
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role: role
      }
    });

    if (authError) {
      return res.status(400).json({ message: authError.message });
    }

    const userId = authData.user?.id;
    if (!userId) {
      return res.status(400).json({ message: 'User registration failed in Supabase Auth' });
    }

    // 2. Insert into custom public.users table to link role & name metadata using admin client
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email: email.toLowerCase(),
        password_hash,
        name,
        role,
        created_at: new Date().toISOString()
      });

    if (dbError) {
      return res.status(500).json({ message: `Profile creation failed: ${dbError.message}` });
    }

    // 3. If the user registered as a vendor, automatically add them to the vendors table if not already existing
    if (role === 'vendor') {
      const { data: existingVendor } = await supabaseAdmin
        .from('vendors')
        .select('id')
        .eq('contact_email', email.toLowerCase())
        .maybeSingle();

      if (!existingVendor) {
        // Generate a valid GST number dynamically for the vendor
        const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
        const dummyGst = `27${randomStr}1234A1Z0`;
        await supabaseAdmin
          .from('vendors')
          .insert({
            name: name,
            category: 'Other',
            gst_number: dummyGst,
            contact_name: name,
            contact_email: email.toLowerCase(),
            contact_phone: '+1-555-0100',
            status: 'pending',
            created_at: new Date().toISOString()
          });
      }
    }

    return res.status(201).json({
      message: 'Registration successful!',
      user: { id: userId, email: email.toLowerCase(), name, role }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Internal server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', loginRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Supabase Authenticate using public client
    const { data: authData, error: authError } = await supabasePublic.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.session) {
      return res.status(400).json({ message: authError?.message || 'Authentication failed' });
    }

    // Fetch corresponding custom role database profile using admin client
    let { data: profile, error: dbError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (dbError || !profile) {
      // Fallback or auto-create custom profile if somehow missing
      const defaultName = authData.user.user_metadata?.full_name || email.split('@')[0];
      const defaultRole = authData.user.user_metadata?.role || 'vendor';
      
      const salt = bcrypt.genSaltSync(10);
      const password_hash = bcrypt.hashSync(password, salt);
      
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          password_hash,
          name: defaultName,
          role: defaultRole,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (!insertError && newProfile) {
        profile = newProfile;
      } else {
        return res.status(500).json({ message: 'User profile resolution failed' });
      }
    }

    return res.json({
      token: authData.session.access_token,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error during login' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPasswordRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;

  try {
    const { error } = await supabasePublic.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.headers.origin || 'http://localhost:5173'}/reset-password`
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.json({ message: 'Password reset email sent successfully. Please check your inbox.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Internal server error during password reset request' });
  }
});

export default router;
