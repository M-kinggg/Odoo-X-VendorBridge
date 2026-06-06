import express from 'express';
import bcrypt from 'bcryptjs';
import authRouter from '../src/routes/auth.js';
import reportsRouter from '../src/routes/reports.js';
import adminRouter from '../src/routes/admin.js';
import rfqsRouter from '../src/routes/rfqs.js';
import { supabaseAdmin } from '../src/config/supabase.js';

const testUsers = [
  { id: 'a1000000-0000-0000-0000-000000000001', email: 'admin@vendorbridge.com', password: 'securePassword123', name: 'Admin User', role: 'admin' },
  { id: 'a1000000-0000-0000-0000-000000000002', email: 'procurement@vendorbridge.com', password: 'securePassword123', name: 'Procurement Officer', role: 'procurement_officer' },
  { id: 'a1000000-0000-0000-0000-000000000003', email: 'manager@vendorbridge.com', password: 'securePassword123', name: 'Manager User', role: 'manager' },
  { id: 'a1000000-0000-0000-0000-000000000004', email: 'vendor@vendorbridge.com', password: 'securePassword123', name: 'Vendor User', role: 'vendor' }
];

const ensureTestUsers = async () => {
  console.log('⏳ Checking and seeding test credentials in Supabase Auth...');
  const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
  const authUsersList = authData?.users || [];

  for (const tu of testUsers) {
    const existingAuth = authUsersList.find(u => u.email?.toLowerCase() === tu.email.toLowerCase());
    
    // If the auth record exists but has a different ID or password, recreate it
    if (existingAuth) {
      console.log(`Recreating auth record for ${tu.email} to align with Seed UUID: ${tu.id}`);
      await supabaseAdmin.auth.admin.deleteUser(existingAuth.id);
    }

    console.log(`Creating auth record for: ${tu.email} with ID: ${tu.id}`);
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      id: tu.id,
      email: tu.email,
      password: tu.password,
      email_confirm: true,
      user_metadata: { full_name: tu.name, role: tu.role }
    });
    if (error) {
      throw new Error(`Failed to create auth user ${tu.email}: ${error.message}`);
    }

    // Upsert into custom public.users table
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(tu.password, salt);
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: tu.id,
        email: tu.email,
        name: tu.name,
        role: tu.role,
        password_hash,
        status: 'active',
        created_at: new Date().toISOString()
      });

    if (dbError) {
      throw new Error(`Failed to sync profile for user ${tu.email}: ${dbError.message}`);
    }

    // If it's a vendor, make sure it exists in public.vendors table
    if (tu.role === 'vendor') {
      const { data: existingVendor } = await supabaseAdmin
        .from('vendors')
        .select('id')
        .eq('contact_email', tu.email.toLowerCase())
        .maybeSingle();

      if (!existingVendor) {
        const dummyGst = `27TESTV1234A1Z0`;
        await supabaseAdmin
          .from('vendors')
          .insert({
            id: tu.id,
            name: tu.name,
            category: 'Other',
            gst_number: dummyGst,
            contact_name: tu.name,
            contact_email: tu.email.toLowerCase(),
            contact_phone: '+1-555-0100',
            status: 'active',
            created_at: new Date().toISOString()
          });
        console.log(`Seeded vendor profile for ${tu.email}`);
      }
    }
  }
  console.log('✅ Seeding checks completed.\n');
};

const runRoleTests = async () => {
  try {
    await ensureTestUsers();
  } catch (err) {
    console.error('❌ Failed during test users verification:', err.message);
    process.exit(1);
  }

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/rfqs', rfqsRouter);

  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}/api`;

    let allPassed = true;

    // Helper: Obtain JWT Token
    const getToken = async (email, password) => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.status !== 200) {
        const bodyText = await res.text();
        throw new Error(`Failed to login as ${email}: Status ${res.status} - ${bodyText}`);
      }
      const data = await res.json();
      return data.token;
    };

    // Helper: Test Endpoint
    const testEndpoint = async (caseNum, email, token, method, path, body = null) => {
      const headers = { 'Authorization': `Bearer ${token}` };
      if (body) {
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
      });

      if (res.status === 403) {
        console.log(`✅ Case ${caseNum}: PASS (${email} accessing ${method} ${path} -> Got 403 Forbidden)`);
        return true;
      } else {
        console.log(`❌ Case ${caseNum}: FAIL (${email} accessing ${method} ${path} -> Got ${res.status} instead of 403)`);
        return false;
      }
    };

    try {
      // 1. Get tokens
      const vendorToken = await getToken('vendor@vendorbridge.com', 'securePassword123');
      const managerToken = await getToken('manager@vendorbridge.com', 'securePassword123');
      const procurementToken = await getToken('procurement@vendorbridge.com', 'securePassword123');

      // 2. Run cases
      // Case 1: vendor accessing reports spend-summary
      const c1 = await testEndpoint(1, 'vendor@vendorbridge.com', vendorToken, 'GET', '/reports/spend-summary');
      if (!c1) allPassed = false;

      // Case 2: vendor accessing admin users
      const c2 = await testEndpoint(2, 'vendor@vendorbridge.com', vendorToken, 'GET', '/admin/users');
      if (!c2) allPassed = false;

      // Case 3: manager accessing post rfq
      const dummyRfq = {
        title: 'Unauthorized RFQ',
        deadline: new Date(Date.now() + 86400000).toISOString(),
        items: [{ product_name: 'Laptop', quantity: 1, unit: 'pcs' }],
        vendorIds: []
      };
      const c3 = await testEndpoint(3, 'manager@vendorbridge.com', managerToken, 'POST', '/rfqs', dummyRfq);
      if (!c3) allPassed = false;

      // Case 4: procurement accessing admin users
      const c4 = await testEndpoint(4, 'procurement@vendorbridge.com', procurementToken, 'GET', '/admin/users');
      if (!c4) allPassed = false;

      if (allPassed) {
        console.log('\n🎉 ALL ROLE RESTRICTION TESTS PASSED: PASS');
        process.exit(0);
      } else {
        console.log('\n❌ ROLE RESTRICTION TESTS FAILED: FAIL');
        process.exit(1);
      }
    } catch (err) {
      console.error('\n❌ Exception during role restriction tests:', err.message);
      process.exit(1);
    } finally {
      server.close();
    }
  });
};

runRoleTests();
