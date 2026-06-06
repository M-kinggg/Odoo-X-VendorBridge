# VendorBridge ERP — Enterprise Procurement & Vendor Portal

VendorBridge is a premium, modern, and state-of-the-art Procurement ERP designed to streamline the procurement lifecycle, vendor onboarding, Request for Quotations (RFQs), bidding, managerial authorization workflows, Purchase Order (PO) dispatch, and tax invoicing.

Built with a robust, modern stack consisting of **Node.js/Express**, **React (Vite)**, **Tailwind CSS**, and **Supabase PostgreSQL**, the platform enforces strict role-based access control and keeps a complete audit log of all business events.

---

## 🌟 Key Features

1. **Role-Based Portals**:
   - **Admin**: Manages system users, deactivates profiles, and modifies user roles.
   - **Procurement Officer**: Registers vendor partners, drafts and publishes RFQs, invites specific vendors, and initiates approval workflows.
   - **Manager**: Authorizes or rejects quotations in the approvals queue.
   - **Vendor**: accesses the secure Vendor Portal, reviews invited RFQs, and submits unit-priced quotations.
2. **Audit Trails & Notifications**:
   - Live activity timeline (`/logs`) recording all CRUD events, approvals, and invoice generations.
   - Live relative notifications bell in the navigation header displaying the last 5 logs matching user permissions, with unread badge counters.
3. **Analytics & Reports (`/reports`)**:
   - Interactive Recharts visualizing Total Spend (Bar Chart), Top Vendors, RFQ Status Distribution (Donut Chart), and Approval Trends (Line Chart).
   - Export summaries to CSV and PDF formats.
4. **Resend Email Integration**:
   - Dispatches HTML-formatted tax invoices containing line item breakdowns, tax calculations, and subtotal figures using the Resend API.
5. **Robust UI/UX Polish**:
   - Custom styled confirmation modals for sensitive actions (deleting vendors, approving/rejecting proposals).
   - Form validations driven by `react-hook-form` and `zod` schemas.
   - Beautiful CSS/Tailwind skeleton grids for all listing pages during API fetch operations.

---

## ⚙️ Project Structure

```
Vendorbridge/
├── client/          # Vite + React Frontend application
│   ├── src/
│   │   ├── components/  # Layouts, guards, navigation components
│   │   ├── context/     # Authentication context provider
│   │   ├── pages/       # Dashboard, Vendors, RFQs, Logs, Reports, Admin pages
│   │   └── services/    # Axios API client configuration
│   └── package.json
├── server/          # Node.js + Express Backend API
│   ├── src/
│   │   ├── config/      # Supabase and DB initialization
│   │   ├── middleware/  # Auth guards and validation layers
│   │   ├── routes/      # REST API endpoints (vendors, rfqs, approvals, etc.)
│   │   └── utils/       # Activity loggers
│   └── package.json
└── supabase/        # Database schema migrations
    └── migrations/
        └── 01_schema.sql  # Core database DDL (tables, enums, FK constraints)
```

---

## 🛠️ Step-by-Step Local Setup

### 1. Database Configuration (Supabase)

1. Create a new project on [Supabase](https://supabase.com).
2. Navigate to the **SQL Editor** in your Supabase Dashboard.
3. Paste and run the DDL schema script located in `supabase/migrations/01_schema.sql` to initialize all 11 tables and enums.

### 2. Backend Setup (`/server`)

1. Open a terminal in the `/server` directory:
   ```bash
   cd server
   npm install
   ```
2. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Configure the following environment variables in `.env`:
   - `PORT`: Server port (default `5000`).
   - `JWT_SECRET`: A secure random secret string for JWT signatures.
   - `SUPABASE_URL`: Your Supabase Project URL.
   - `SUPABASE_ANON_KEY`: Your Supabase API Anon Key.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (required for administrative auth operations).
   - `RESEND_API_KEY`: Your Resend API key (e.g. `re_...`). Use `re_test_key` to run local simulated tests.
4. Start the backend server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup (`/client`)

1. Open a terminal in the `/client` directory:
   ```bash
   cd client
   npm install
   ```
2. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Verify that `VITE_API_URL` points to your backend server (e.g., `http://localhost:5000/api`).
4. Start the frontend Vite server:
   ```bash
   npm run dev
   ```

---

## 🧪 Running the Integration Test Suite

The backend contains a self-contained, end-to-end integration lifecycle test suite that validates the entire ERP workflow:

```bash
cd server
node scripts/test-api.js
```

**Workflow Verified**:
1. User registration & JWT authentication
2. Vendor registration
3. RFQ drafting, item addition, and publishing
4. Vendor invitation & quotation bid submission
5. Bids comparison matrix
6. Manager approval workflow
7. Automatic Purchase Order (PO) generation
8. Tax Invoice creation, subtotal calculation, and modification
9. HTML Invoice email dispatch simulation

---

## 👥 Test Credentials

For manual testing, you can sign up new accounts directly through the UI. The database is pre-seeded with the following credentials (all passwords are `securePassword123`):

| Email | Role | Access / Permissions |
| :--- | :--- | :--- |
| `admin@vendorbridge.com` | **Admin** | User administration panel, modify roles/status, invite members. |
| `officer@vendorbridge.com` | **Procurement Officer** | Vendors registry, RFQ publishing, Quotation comparisons. |
| `manager@vendorbridge.com` | **Manager** | Review quotations queue, authorize or reject proposals. |
| `vendor@vendorbridge.com` | **Vendor** | Secure Vendor Portal, bid submission, review invited RFQs. |

---

## 📡 Core API Routes Table

| Method | Endpoint | Description | Guard / Role |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/signup` | Register a new user | Public |
| **POST** | `/api/auth/login` | Login and retrieve token | Public |
| **GET** | `/api/vendors` | Search and filter vendors | Authenticated |
| **POST** | `/api/vendors` | Create a new vendor profile | Officer / Admin |
| **GET** | `/api/rfqs` | List requests for quotation | Authenticated |
| **POST** | `/api/rfqs` | Create RFQ with line items | Officer / Admin |
| **GET** | `/api/approvals` | List quotation approvals | Manager / Admin |
| **PATCH**| `/api/approvals/:id/action` | Approve/reject a quotation | Manager / Admin |
| **GET** | `/api/purchase-orders` | List purchase orders | Authenticated |
| **POST** | `/api/invoices` | Generate invoice from PO | Officer / Admin |
| **POST** | `/api/invoices/:id/send-email`| Dispatch HTML invoice via Resend | Authenticated |
| **GET** | `/api/logs` | Fetch activity timeline feed | Authenticated |
| **GET** | `/api/reports/spend-summary`| Fetch dashboard spend metrics | Officer / Manager / Admin |
| **GET** | `/api/admin/users` | List system users | Admin |
