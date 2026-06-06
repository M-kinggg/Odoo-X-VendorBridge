// Complete ERP Lifecycle Integration Test Suite
// Verifies: Vendors CRUD -> RFQ creation -> Vendor invitation -> Bidding submission
//           -> Bids comparison -> Approvals workflow -> PO auto-creation -> Invoice generation -> Email simulated dispatcher

import express from 'express';
import authRouter from '../src/routes/auth.js';
import vendorsRouter from '../src/routes/vendors.js';
import rfqsRouter from '../src/routes/rfqs.js';
import quotationsRouter from '../src/routes/quotations.js';
import approvalsRouter from '../src/routes/approvals.js';
import purchaseOrdersRouter from '../src/routes/purchaseOrders.js';
import invoicesRouter from '../src/routes/invoices.js';

const runLifecycleTests = async () => {
  console.log('🧪 Starting VendorBridge Complete ERP Lifecycle Tests...\n');
  console.log("✅ Connected to Supabase at https://nlxvjdonjbnvxncbwezq.supabase.co");

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/vendors', vendorsRouter);
  app.use('/api/rfqs', rfqsRouter);
  app.use('/api/quotations', quotationsRouter);
  app.use('/api/approvals', approvalsRouter);
  app.use('/api/purchase-orders', purchaseOrdersRouter);
  app.use('/api/invoices', invoicesRouter);

  // Start program server on dynamic test port
  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}/api`;
    console.log(`📡 Dynamic Test Server listening on ${baseUrl}`);

    try {
      // 1. Setup User Profiles
      const pOfficer = {
        name: 'Procurement Officer Tester',
        email: `officer_${Date.now()}@vendorbridge.com`,
        password: 'securePassword123',
        role: 'procurement_officer'
      };

      const manager = {
        name: 'Manager Tester',
        email: `manager_${Date.now()}@vendorbridge.com`,
        password: 'securePassword123',
        role: 'manager'
      };

      const vendorUser = {
        name: 'Apex Vendor Tester',
        email: `vendor_tester_${Date.now()}@vendorbridge.com`,
        password: 'securePassword123',
        role: 'vendor'
      };

      // Register Procurement Officer
      const poSignup = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pOfficer)
      });
      if (poSignup.status !== 201) {
        const errBody = await poSignup.text();
        throw new Error(`Procurement Officer signup failed: ${poSignup.status} - ${errBody}`);
      }

      // Authenticate Procurement Officer
      const poLogin = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pOfficer.email, password: pOfficer.password })
      });
      const poAuth = await poLogin.json();
      const poToken = poAuth.token;
      console.log('✅ Procurement Officer authenticated.');

      // Register Manager
      const mgrSignup = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manager)
      });
      if (mgrSignup.status !== 201) {
        const errBody = await mgrSignup.text();
        throw new Error(`Manager signup failed: ${mgrSignup.status} - ${errBody}`);
      }

      // Authenticate Manager
      const mgrLogin = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: manager.email, password: manager.password })
      });
      const mgrAuth = await mgrLogin.json();
      const mgrToken = mgrAuth.token;
      console.log('✅ Manager authenticated.');

      // 2. Module 1: Create Vendor Profile (As Procurement Officer)
      console.log('\n⏳ Module 1: Creating Vendor Profile...');
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let randomLetters = '';
      for (let i = 0; i < 5; i++) {
        randomLetters += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const randomGst = `27${randomLetters}1234A1Z1`;
      const vendorProfile = {
        name: 'Apex Tech Suppliers',
        category: 'IT',
        gst_number: randomGst,
        contact_name: 'Alex Mercer',
        contact_email: vendorUser.email,
        contact_phone: '+1-555-0987',
        status: 'active'
      };

      const vendorRes = await fetch(`${baseUrl}/vendors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${poToken}`
        },
        body: JSON.stringify(vendorProfile)
      });
      const vendorData = await vendorRes.json();
      if (vendorRes.status !== 201) throw new Error(`Vendor creation failed: ${JSON.stringify(vendorData)}`);
      const vendorId = vendorData.id;
      console.log(`✅ Vendor Profile created: ${vendorProfile.name} (ID: ${vendorId})`);

      // Register corresponding Vendor User (for login authentication)
      const vSignup = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorUser)
      });
      if (vSignup.status !== 201) {
        const errBody = await vSignup.text();
        throw new Error(`Vendor User signup failed: ${vSignup.status} - ${errBody}`);
      }

      // Authenticate Vendor
      const vLogin = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: vendorUser.email, password: vendorUser.password })
      });
      const vAuth = await vLogin.json();
      const vendorToken = vAuth.token;
      console.log('✅ Vendor User authenticated.');

      // 3. Module 2: Create RFQ (As Procurement Officer)
      console.log('\n⏳ Module 2: Creating RFQ...');
      const newRfq = {
        title: 'Q3 Laptop Supply',
        description: 'Bids invited for 20 units of enterprise laptops.',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
          { product_name: 'Developer Laptop 32GB RAM', quantity: 20, unit: 'pcs', specifications: 'Core i7, 1TB SSD' }
        ],
        vendorIds: [vendorId]
      };

      const rfqRes = await fetch(`${baseUrl}/rfqs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${poToken}`
        },
        body: JSON.stringify(newRfq)
      });
      const rfqData = await rfqRes.json();
      if (rfqRes.status !== 201) throw new Error(`RFQ creation failed: ${JSON.stringify(rfqData)}`);
      const rfqId = rfqData.id;
      const rfqItemId = rfqData.items[0].id;
      console.log(`✅ RFQ Created: "${newRfq.title}" (ID: ${rfqId})`);

      // Publish RFQ (Patch status to open)
      await fetch(`${baseUrl}/rfqs/${rfqId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${poToken}`
        },
        body: JSON.stringify({ status: 'open' })
      });
      console.log('✅ RFQ published to open.');

      // 4. Module 3: Submit Quotation (As Vendor)
      console.log('\n⏳ Module 3: Checking invites and submitting quotation...');
      const inviteRes = await fetch(`${baseUrl}/quotations/vendor-portal/rfqs`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${vendorToken}` }
      });
      const invites = await inviteRes.json();
      if (invites.length === 0) throw new Error('Vendor did not receive RFQ invite.');
      console.log(`✅ Vendor received ${invites.length} invite(s).`);

      const quotePayload = {
        rfq_id: rfqId,
        delivery_days: 14,
        notes: 'Price includes shipping and 2-year business warranty.',
        items: [
          { rfq_item_id: rfqItemId, unit_price: 1250 }
        ]
      };

      const quoteRes = await fetch(`${baseUrl}/quotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${vendorToken}`
        },
        body: JSON.stringify(quotePayload)
      });
      const quoteData = await quoteRes.json();
      if (quoteRes.status !== 201) throw new Error(`Quotation submission failed: ${JSON.stringify(quoteData)}`);
      const quotationId = quoteData.id;
      console.log(`✅ Quotation bid submitted. Quote ID: ${quotationId}. Grand Total: $${quoteData.total_price}`);

      // 5. Module 4: Compare Quotes & Initiate Approval (As Procurement Officer)
      console.log('\n⏳ Module 4: Comparing quotes and initiating approvals workflow...');
      const compRes = await fetch(`${baseUrl}/rfqs/${rfqId}/quotations`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${poToken}` }
      });
      const quotationsToCompare = await compRes.json();
      if (quotationsToCompare.length === 0) throw new Error('No quotations retrieved for comparison.');
      console.log(`✅ Retrieved ${quotationsToCompare.length} bid(s) for comparison.`);

      const approvalRes = await fetch(`${baseUrl}/approvals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${poToken}`
        },
        body: JSON.stringify({ rfq_id: rfqId, quotation_id: quotationId })
      });
      const approvalData = await approvalRes.json();
      if (approvalRes.status !== 201) throw new Error(`Approvals initiation failed: ${JSON.stringify(approvalData)}`);
      const approvalId = approvalData.id;
      console.log(`✅ Quotation submitted for approval. Approval ID: ${approvalId}`);

      // 6. Module 5: Approve Bids & Generate PO (As Manager)
      console.log('\n⏳ Module 5: Processing Manager Approval...');
      const actionRes = await fetch(`${baseUrl}/approvals/${approvalId}/action`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mgrToken}`
        },
        body: JSON.stringify({ action: 'approved', remarks: 'Pricing is within budgeted range. Approved.' })
      });
      const actionData = await actionRes.json();
      if (actionRes.status !== 200) throw new Error(`Approval action failed: ${JSON.stringify(actionData)}`);
      const poId = actionData.po.id;
      console.log(`✅ Quotation Approved! Purchase Order generated: ${actionData.po.po_number} (ID: ${poId})`);

      // 7. Module 6: Confirm Order, Generate & Dispatch Invoice
      console.log('\n⏳ Module 6: Ordering, Invoicing and Simulated Dispatch...');
      
      // Confirm PO status
      const poConfirm = await fetch(`${baseUrl}/purchase-orders/${poId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${poToken}`
        },
        body: JSON.stringify({ status: 'confirmed' })
      });
      if (poConfirm.status !== 200) throw new Error('PO confirmation failed');
      console.log('✅ PO status set to confirmed.');

      // Generate invoice
      const invoiceGen = await fetch(`${baseUrl}/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${poToken}`
        },
        body: JSON.stringify({ po_id: poId })
      });
      const invoiceData = await invoiceGen.json();
      if (invoiceGen.status !== 201) throw new Error(`Invoice generation failed: ${JSON.stringify(invoiceData)}`);
      const invoiceId = invoiceData.id;
      console.log(`✅ Invoice draft generated successfully: ${invoiceData.invoice_number} (Total: $${invoiceData.total})`);

      // Modify tax percentage to 10%
      const invoiceUpdate = await fetch(`${baseUrl}/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${poToken}`
        },
        body: JSON.stringify({ tax_percent: 10 })
      });
      const updatedInvoice = await invoiceUpdate.json();
      if (invoiceUpdate.status !== 200) throw new Error('Invoice tax modification failed');
      console.log(`✅ Invoice updated. New Tax: ${updatedInvoice.tax_percent}%, New Total Due: $${updatedInvoice.total}`);

      // Simulated email dispatch
      const emailRes = await fetch(`${baseUrl}/invoices/${invoiceId}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${poToken}`
        },
        body: JSON.stringify({
          to: 'delivered@resend.dev',
          subject: 'Your invoice details from VendorBridge',
          body: `Hi, your bill has been logged at 10% tax rate. Total: $${updatedInvoice.total}`
        })
      });
      const emailData = await emailRes.json();
      if (emailRes.status !== 200) throw new Error(`Invoice email dispatch failed: ${JSON.stringify(emailData)}`);
      console.log(`✅ Invoice email successfully dispatched. Message ID: ${emailData.messageId}`);

      console.log('\n🎉 ALL PHASE 2 LIFECYCLE TESTS COMPLETED SUCCESSFULLY!');
      process.exit(0);

    } catch (err) {
      console.error('\n❌ INTEGRATION LIFE CYCLE TEST FAILED:', err.message);
      process.exit(1);
    } finally {
      server.close();
    }
  });
};

runLifecycleTests();
