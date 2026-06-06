import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';
import { Resend } from 'resend';
import bcrypt from 'bcryptjs';

const router = Router();

// GET /api/admin/users
// Retrieves all users (admin only)
router.get('/users', [authenticateToken, authorizeRole(['admin'])], async (req, res) => {
  try {
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json(users || []);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return res.status(500).json({ message: 'Error retrieving user registry' });
  }
});

// PUT /api/admin/users/:id
// Updates a user's role and/or status (admin only)
router.put('/users/:id', [authenticateToken, authorizeRole(['admin'])], async (req, res) => {
  const { id } = req.params;
  const { role, status } = req.body;

  try {
    const updates = {};
    if (role) updates.role = role;
    if (status) updates.status = status;

    // 1. Update in the custom public.users table
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(404).json({ message: 'User not found or update failed' });

    // 2. Sync active/inactive status to Supabase Auth using the Admin API
    if (status === 'inactive') {
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        ban_duration: 'infinite'
      });
      if (banError) {
        console.error('Failed to ban user in Supabase Auth:', banError.message);
      }
    } else if (status === 'active') {
      const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        ban_duration: 'none'
      });
      if (unbanError) {
        console.error('Failed to unban user in Supabase Auth:', unbanError.message);
      }
    }

    return res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Error updating user profile metadata' });
  }
});

// POST /api/admin/users/invite
// Invites a new user by creating their auth record and sending a welcome email via Resend
router.post('/users/invite', [
  authenticateToken,
  authorizeRole(['admin']),
  body('email').isEmail().withMessage('Valid email is required'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('role').isIn(['admin', 'procurement_officer', 'manager', 'vendor']).withMessage('Invalid role selected')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, name, role } = req.body;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    return res.status(500).json({ 
      message: '🚨 [VendorBridge Server] CRITICAL ERROR: Missing RESEND_API_KEY environment variable. Invite email cannot be sent.' 
    });
  }

  try {
    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email address already exists' });
    }

    // Generate dynamic secure temporary password
    const tempPassword = 'WelcomeVB2026!' + Math.floor(100 + Math.random() * 900);
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(tempPassword, salt);

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
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
      return res.status(400).json({ message: 'Failed to create user in Auth database' });
    }

    // 2. Insert into custom public.users table
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email: email.toLowerCase(),
        password_hash,
        name,
        role,
        status: 'active',
        created_at: new Date().toISOString()
      });

    if (dbError) {
      // Cleanup auth user if DB insert fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(500).json({ message: `Failed to insert user profile: ${dbError.message}` });
    }

    // 3. Automatically insert standard vendor profile if invited as a vendor
    if (role === 'vendor') {
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

    // 4. Send email via Resend
    const resend = new Resend(resendApiKey);
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'VendorBridge <onboarding@resend.dev>',
      to: email,
      subject: 'Welcome to VendorBridge ERP - Access Invited',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-2xl;">
          <h2 style="color: #0f172a;">Welcome to VendorBridge ERP</h2>
          <p>Hi ${name},</p>
          <p>You have been invited to join the VendorBridge portal as a <strong>${role}</strong>.</p>
          <p>Here are your temporary login credentials to get started:</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #cbd5e1;">
            <p style="margin: 4px 0;"><strong>Login Link:</strong> <a href="http://localhost:5173/login">http://localhost:5173/login</a></p>
            <p style="margin: 4px 0;"><strong>Username / Email:</strong> ${email}</p>
            <p style="margin: 4px 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
          </div>
          <p style="color: #64748b; font-size: 13px;">For security reasons, we recommend updating your password after your first successful login.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">This email is dispatched from the VendorBridge Admin Panel.</p>
        </div>
      `
    });

    if (emailError) {
      console.error('Failed to send invite email:', emailError.message);
      // We do not roll back the user creation, but we warn the client
      return res.status(201).json({
        message: `User created, but email dispatch failed: ${emailError.message}`,
        user: { id: userId, email, name, role }
      });
    }

    return res.status(201).json({
      message: 'User successfully created and invitation email sent!',
      user: { id: userId, email, name, role }
    });
  } catch (error) {
    console.error('Error inviting user:', error);
    return res.status(500).json({ message: 'Error processing user invitation' });
  }
});

export default router;
