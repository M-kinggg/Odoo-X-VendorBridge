// Mock In-Memory Database for VendorBridge
import bcrypt from 'bcryptjs';

// Setup default users with bcrypt hashed passwords
const salt = bcrypt.genSaltSync(10);

export const mockDb = {
  users: [
    {
      id: 'u1111111-1111-1111-1111-111111111111',
      email: 'admin@vendorbridge.com',
      password_hash: bcrypt.hashSync('admin123', salt),
      role: 'admin',
      name: 'Sarah Connor',
      created_at: new Date('2026-01-10T08:00:00Z')
    },
    {
      id: 'u2222222-2222-2222-2222-222222222222',
      email: 'procurement@vendorbridge.com',
      password_hash: bcrypt.hashSync('procurement123', salt),
      role: 'procurement_officer',
      name: 'James Carter',
      created_at: new Date('2026-02-15T09:30:00Z')
    },
    {
      id: 'u3333333-3333-3333-3333-333333333333',
      email: 'manager@vendorbridge.com',
      password_hash: bcrypt.hashSync('manager123', salt),
      role: 'manager',
      name: 'Elena Rostova',
      created_at: new Date('2026-03-01T10:15:00Z')
    },
    {
      id: 'u4444444-4444-4444-4444-444444444444',
      email: 'vendor@vendorbridge.com',
      password_hash: bcrypt.hashSync('vendor123', salt),
      role: 'vendor',
      name: 'Apex Solutions (John Doe)',
      created_at: new Date('2026-03-20T14:00:00Z')
    }
  ],

  vendors: [
    {
      id: 'v1111111-1111-1111-1111-111111111111',
      name: 'Apex Solutions',
      category: 'Electronics & IT Hardware',
      gst_number: '27AAAAA1111A1Z1',
      contact_name: 'John Doe',
      contact_email: 'vendor@vendorbridge.com',
      contact_phone: '+1-555-0199',
      status: 'active',
      created_at: new Date('2026-03-20T14:00:00Z')
    },
    {
      id: 'v2222222-2222-2222-2222-222222222222',
      name: 'Global Logistics Corp',
      category: 'Supply Chain & Freight',
      gst_number: '27BBBBB2222B2Z2',
      contact_name: 'Alice Smith',
      contact_email: 'alice@globallogistics.com',
      contact_phone: '+1-555-0188',
      status: 'active',
      created_at: new Date('2026-03-25T11:00:00Z')
    },
    {
      id: 'v3333333-3333-3333-3333-333333333333',
      name: 'Prime Office Supplies',
      category: 'Stationery & Furniture',
      gst_number: '27CCCCC3333C3Z3',
      contact_name: 'Robert Lang',
      contact_email: 'robert@primesupplies.com',
      contact_phone: '+1-555-0177',
      status: 'pending',
      created_at: new Date('2026-04-01T09:00:00Z')
    },
    {
      id: 'v4444444-4444-4444-4444-444444444444',
      name: 'Vanguard Tech Solutions',
      category: 'Software Services',
      gst_number: '27DDDDD4444D4Z4',
      contact_name: 'Michael Scott',
      contact_email: 'michael@vanguardtech.com',
      contact_phone: '+1-555-0166',
      status: 'active',
      created_at: new Date('2026-04-05T16:45:00Z')
    },
    {
      id: 'v5555555-5555-5555-5555-555555555555',
      name: 'EcoEnergy Systems',
      category: 'Power & Utilities',
      gst_number: '27EEEEE5555E5Z5',
      contact_name: 'Clara Oswald',
      contact_email: 'clara@ecoenergy.com',
      contact_phone: '+1-555-0155',
      status: 'inactive',
      created_at: new Date('2026-04-12T10:30:00Z')
    }
  ],

  rfqs: [
    {
      id: 'rfq11111-1111-1111-1111-111111111111',
      title: 'Enterprise Server Upgrade',
      description: 'Requesting quotations for 5 units of high-performance rack servers with 256GB RAM.',
      deadline: new Date('2026-07-15T18:00:00Z'),
      status: 'open',
      created_by: 'u2222222-2222-2222-2222-222222222222',
      created_at: new Date('2026-06-01T10:00:00Z')
    },
    {
      id: 'rfq22222-2222-2222-2222-222222222222',
      title: 'Office Ergonomic Chairs',
      description: 'RFQ for 50 pieces of ergonomic chairs for corporate office setup.',
      deadline: new Date('2026-06-25T18:00:00Z'),
      status: 'open',
      created_by: 'u2222222-2222-2222-2222-222222222222',
      created_at: new Date('2026-06-02T11:30:00Z')
    },
    {
      id: 'rfq33333-3333-3333-3333-333333333333',
      title: 'AC Maintenance Services 2026',
      description: 'Annual maintenance contract for HVAC systems at Head Office.',
      deadline: new Date('2026-05-30T18:00:00Z'),
      status: 'closed',
      created_by: 'u2222222-2222-2222-2222-222222222222',
      created_at: new Date('2026-05-10T09:00:00Z')
    }
  ],

  rfq_items: [
    {
      id: 'ri111111-1111-1111-1111-111111111111',
      rfq_id: 'rfq11111-1111-1111-1111-111111111111',
      product_name: 'Rack Server 2U (Intel Xeon 32 Core, 256GB RAM)',
      quantity: 5,
      unit: 'Units',
      specifications: 'Hot-swappable drives, Dual Redundant Power Supplies, 5 Years warranty'
    },
    {
      id: 'ri222222-2222-2222-2222-222222222222',
      rfq_id: 'rfq22222-2222-2222-2222-222222222222',
      product_name: 'Ergonomic Desk Chair (Mesh back, adjustable lumbar support)',
      quantity: 50,
      unit: 'Pieces',
      specifications: '3D Armrests, Gas-lift Class 4, Seat slider mechanism'
    }
  ],

  rfq_vendors: [
    {
      id: 'rv111111-1111-1111-1111-111111111111',
      rfq_id: 'rfq11111-1111-1111-1111-111111111111',
      vendor_id: 'v1111111-1111-1111-1111-111111111111',
      invited_at: new Date('2026-06-01T10:05:00Z')
    },
    {
      id: 'rv222222-2222-2222-2222-222222222222',
      rfq_id: 'rfq11111-1111-1111-1111-111111111111',
      vendor_id: 'v4444444-4444-4444-4444-444444444444',
      invited_at: new Date('2026-06-01T10:05:00Z')
    }
  ],

  quotations: [
    {
      id: 'q1111111-1111-1111-1111-111111111111',
      rfq_id: 'rfq11111-1111-1111-1111-111111111111',
      vendor_id: 'v1111111-1111-1111-1111-111111111111',
      total_price: 18500.00,
      delivery_days: 10,
      notes: 'Apex Server Quote. High-quality parts. Includes installation support.',
      status: 'submitted',
      submitted_at: new Date('2026-06-03T12:00:00Z')
    },
    {
      id: 'q2222222-2222-2222-2222-222222222222',
      rfq_id: 'rfq11111-1111-1111-1111-111111111111',
      vendor_id: 'v4444444-4444-4444-4444-444444444444',
      total_price: 19800.00,
      delivery_days: 7,
      notes: 'Express delivery option within 7 days. Standard pricing.',
      status: 'submitted',
      submitted_at: new Date('2026-06-04T15:20:00Z')
    }
  ],

  quotation_items: [
    {
      id: 'qi111111-1111-1111-1111-111111111111',
      quotation_id: 'q1111111-1111-1111-1111-111111111111',
      rfq_item_id: 'ri111111-1111-1111-1111-111111111111',
      unit_price: 3700.00,
      total_price: 18500.00
    },
    {
      id: 'qi222222-2222-2222-2222-222222222222',
      quotation_id: 'q2222222-2222-2222-2222-222222222222',
      rfq_item_id: 'ri111111-1111-1111-1111-111111111111',
      unit_price: 3960.00,
      total_price: 19800.00
    }
  ],

  approvals: [
    {
      id: 'a1111111-1111-1111-1111-111111111111',
      rfq_id: 'rfq11111-1111-1111-1111-111111111111',
      quotation_id: 'q1111111-1111-1111-1111-111111111111',
      approver_id: 'u3333333-3333-3333-3333-333333333333',
      status: 'pending',
      remarks: 'Looks good technically and financially. Under manager review.',
      created_at: new Date('2026-06-04T09:00:00Z'),
      actioned_at: null
    }
  ],

  purchase_orders: [
    {
      id: 'po111111-1111-1111-1111-111111111111',
      po_number: 'PO-2026-0001',
      rfq_id: 'rfq33333-3333-3333-3333-333333333333',
      quotation_id: 'q1111111-1111-1111-1111-111111111111', // linking to vendor
      vendor_id: 'v1111111-1111-1111-1111-111111111111',
      status: 'confirmed',
      created_at: new Date('2026-05-15T10:00:00Z')
    },
    {
      id: 'po222222-2222-2222-2222-222222222222',
      po_number: 'PO-2026-0002',
      rfq_id: null,
      quotation_id: null,
      vendor_id: 'v2222222-2222-2222-2222-222222222222',
      status: 'pending',
      created_at: new Date('2026-06-01T14:30:00Z')
    },
    {
      id: 'po333333-3333-3333-3333-333333333333',
      po_number: 'PO-2026-0003',
      rfq_id: null,
      quotation_id: null,
      vendor_id: 'v4444444-4444-4444-4444-444444444444',
      status: 'delivered',
      created_at: new Date('2026-05-20T11:00:00Z')
    }
  ],

  invoices: [
    {
      id: 'i1111111-1111-1111-1111-111111111111',
      invoice_number: 'INV-2026-012',
      po_id: 'po111111-1111-1111-1111-111111111111',
      tax_percent: 18.00,
      subtotal: 10000.00,
      tax_amount: 1800.00,
      total: 11800.00,
      status: 'paid',
      created_at: new Date('2026-05-18T10:00:00Z')
    },
    {
      id: 'i2222222-2222-2222-2222-222222222222',
      invoice_number: 'INV-2026-015',
      po_id: 'po222222-2222-2222-2222-222222222222',
      tax_percent: 18.00,
      subtotal: 5400.00,
      tax_amount: 972.00,
      total: 6372.00,
      status: 'sent',
      created_at: new Date('2026-06-02T15:00:00Z')
    },
    {
      id: 'i3333333-3333-3333-3333-333333333333',
      invoice_number: 'INV-2026-016',
      po_id: 'po333333-3333-3333-3333-333333333333',
      tax_percent: 18.00,
      subtotal: 25000.00,
      tax_amount: 4500.00,
      total: 29500.00,
      status: 'draft',
      created_at: new Date('2026-06-05T09:15:00Z')
    }
  ],

  activity_logs: [
    {
      id: 'l1111111-1111-1111-1111-111111111111',
      user_id: 'u2222222-2222-2222-2222-222222222222',
      action: 'CREATE',
      entity_type: 'RFQ',
      entity_id: 'rfq11111-1111-1111-1111-111111111111',
      description: 'Created RFQ for Enterprise Server Upgrade',
      created_at: new Date('2026-06-01T10:00:00Z')
    },
    {
      id: 'l2222222-2222-2222-2222-222222222222',
      user_id: 'u4444444-4444-4444-4444-444444444444',
      action: 'SUBMIT_QUOTE',
      entity_type: 'Quotation',
      entity_id: 'q1111111-1111-1111-1111-111111111111',
      description: 'Apex Solutions submitted quotation for Enterprise Server Upgrade RFQ',
      created_at: new Date('2026-06-03T12:00:00Z')
    }
  ]
};
