import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';
import vendorsRouter from './routes/vendors.js';
import rfqsRouter from './routes/rfqs.js';
import quotationsRouter from './routes/quotations.js';
import approvalsRouter from './routes/approvals.js';
import purchaseOrdersRouter from './routes/purchaseOrders.js';
import invoicesRouter from './routes/invoices.js';
import logsRouter from './routes/logs.js';
import reportsRouter from './routes/reports.js';
import adminRouter from './routes/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Setup Middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Setup Routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/rfqs', rfqsRouter);
app.use('/api/quotations', quotationsRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/purchase-orders', purchaseOrdersRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/logs', logsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/admin', adminRouter);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Default 404 Route
app.use((req, res) => {
  res.status(404).json({ message: `API Endpoint Not Found: ${req.method} ${req.url}` });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ message: 'Internal server error occurred' });
});

app.listen(PORT, () => {
  console.log(`🚀 [VendorBridge Server] running on http://localhost:${PORT}`);
});
