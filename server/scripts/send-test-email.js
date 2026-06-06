import express from 'express';
import authRouter from '../src/routes/auth.js';
import invoicesRouter from '../src/routes/invoices.js';

const runEmailTest = async () => {
  const recipient = process.argv[2] || 'delivered@resend.dev';
  console.log(`✉️ Starting real Resend email dispatch test to: ${recipient}...`);

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/invoices', invoicesRouter);

  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}/api`;

    try {
      // 1. Authenticate as Procurement Officer
      const authRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'procurement@vendorbridge.com',
          password: 'securePassword123'
        })
      });

      if (authRes.status !== 200) {
        const text = await authRes.text();
        throw new Error(`Authentication failed: ${authRes.status} - ${text}`);
      }

      const { token } = await authRes.json();
      console.log('✅ Authenticated successfully.');

      // 2. Trigger real email dispatch
      console.log('⏳ Triggering email dispatch API call...');
      const emailRes = await fetch(`${baseUrl}/invoices/e2000000-0000-0000-0000-000000000001/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to: recipient,
          subject: 'VendorBridge Real Email Verification',
          body: 'This is a test invoice dispatch sent to verify real Resend API connectivity.'
        })
      });

      const data = await emailRes.json();

      if (emailRes.status === 200) {
        console.log('\n🎉 EMAIL DISPATCH SUCCESSFUL!');
        console.log('Response Details:', JSON.stringify(data, null, 2));
      } else {
        console.log(`\n❌ EMAIL DISPATCH FAILED: Status ${emailRes.status}`);
        console.log('Error Details:', JSON.stringify(data, null, 2));
      }

    } catch (err) {
      console.error('\n❌ Exception during email dispatch test:', err.message);
    } finally {
      server.close();
    }
  });
};

runEmailTest();
