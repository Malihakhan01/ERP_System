-- ==============================================================================
-- FactoryOS Garment ERP — Production PostgreSQL Database Schema (Supabase)
-- Module: Workforce, Employees, Documents, Attendance, Advances & Payroll
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. EMP-2026-001
    
    -- Personal & Contact Information
    full_name VARCHAR(150) NOT NULL,
    father_name VARCHAR(150),
    cnic VARCHAR(30) UNIQUE,
    phone VARCHAR(50) NOT NULL,
    phone_country_code VARCHAR(10) DEFAULT '+92',
    phone_number VARCHAR(50),
    full_phone_number VARCHAR(50),
    whatsapp_phone VARCHAR(50),
    whatsapp_country_code VARCHAR(10) DEFAULT '+92',
    whatsapp_number VARCHAR(50),
    email VARCHAR(150),
    address TEXT,
    city VARCHAR(100),
    emergency_contact VARCHAR(100),
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(50),
    emergency_country_code VARCHAR(10) DEFAULT '+92',
    emergency_phone_number VARCHAR(50),
    emergency_relation VARCHAR(50),
    
    -- Employment Information
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(150) NOT NULL,
    employment_type VARCHAR(50) NOT NULL DEFAULT 'Permanent', -- Permanent, Contract, Temporary
    status VARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, On Leave, Resigned, Terminated, Inactive
    
    -- Salary & Wage Configuration
    salary_type VARCHAR(50) NOT NULL DEFAULT 'monthly', -- monthly, daily, piece_rate
    monthly_salary NUMERIC(15, 2) DEFAULT 0,
    daily_rate NUMERIC(15, 2) DEFAULT 0,
    piece_rate NUMERIC(15, 2) DEFAULT 0,
    bank_name VARCHAR(100),
    account_number VARCHAR(100),
    payment_mode VARCHAR(50) DEFAULT 'Bank Transfer', -- Bank Transfer, Cash, Cheque
    
    -- Production Floor & Skills
    skill_level VARCHAR(50), -- Trainee, Semi-Skilled, Skilled, Master Craftsman, Supervisor
    assigned_line VARCHAR(100),
    operation VARCHAR(150),
    shift VARCHAR(50) DEFAULT 'General',
    experience_years NUMERIC(4, 1),
    training_date DATE,
    verified_by VARCHAR(150),
    last_evaluation_date DATE,
    
    -- Meta & Safety
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PIECE RATE OPERATIONS (Operations matrix per worker)
CREATE TABLE IF NOT EXISTS public.piece_rate_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    operation_name VARCHAR(150) NOT NULL,
    rate_per_piece NUMERIC(10, 2) NOT NULL DEFAULT 0,
    standard_smv NUMERIC(8, 2),
    target_pcs_per_hour INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. EMPLOYEE DOCUMENTS (Metadata for files in Supabase Storage)
CREATE TABLE IF NOT EXISTS public.employee_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- cnic_front, cnic_back, contract, photo, medical, joining_letter
    title VARCHAR(150) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT,
    file_size VARCHAR(50),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by VARCHAR(150) DEFAULT 'HR Admin'
);

-- 4. EMPLOYEE AUDIT & TIMELINE
CREATE TABLE IF NOT EXISTS public.employee_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- created, updated, salary_updated, department_changed, status_changed, archived, document_uploaded
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    actor VARCHAR(150) DEFAULT 'System',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ATTENDANCE & BIOMETRIC DAILY LOGS
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    status VARCHAR(50) NOT NULL DEFAULT 'Present', -- Present, Late, Absent, On Leave, Holiday
    overtime_hours NUMERIC(4, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- 6. EMPLOYEE ADVANCES & LOANS
CREATE TABLE IF NOT EXISTS public.employee_advances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advance_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. ADV-2026-001
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    requested_amount NUMERIC(15, 2) NOT NULL,
    approved_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    repayment_months INT NOT NULL DEFAULT 1,
    monthly_deduction NUMERIC(15, 2) NOT NULL DEFAULT 0,
    remaining_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Approved, Disbursed, Recovering, Completed, Rejected, Archived
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    approved_by VARCHAR(150),
    approved_date TIMESTAMPTZ,
    disbursed_date TIMESTAMPTZ,
    disbursed_by VARCHAR(150),
    notes TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6b. ADVANCE REPAYMENTS & MONTHLY LEDGER
CREATE TABLE IF NOT EXISTS public.advance_repayments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advance_id UUID NOT NULL REFERENCES public.employee_advances(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    deduction_month VARCHAR(50) NOT NULL, -- e.g. 'Sep 2026'
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    balance_after_deduction NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Paid, Skipped
    payroll_run_id VARCHAR(100),
    paid_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. MONTHLY PAYROLL RUNS & DISBURSEMENTS
CREATE TABLE IF NOT EXISTS public.payroll_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. PAY-2026-001
    payroll_month VARCHAR(20) NOT NULL, -- e.g. 2026-08
    department_filter VARCHAR(100) DEFAULT 'all',
    status VARCHAR(50) NOT NULL DEFAULT 'Completed', -- Draft, Processing, Completed, Paid
    total_gross NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_deductions NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_net_payable NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_advance_deductions NUMERIC(15, 2) NOT NULL DEFAULT 0,
    employees_count INT NOT NULL DEFAULT 0,
    processed_by VARCHAR(150) DEFAULT 'HR Manager',
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. EMPLOYEE PAYROLL RECORDS (INDIVIDUAL WAGE SLIPS)
CREATE TABLE IF NOT EXISTS public.payroll_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_run_id UUID REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_number VARCHAR(50) NOT NULL,
    employee_name VARCHAR(150) NOT NULL,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(150) NOT NULL,
    payroll_month VARCHAR(20) NOT NULL,
    salary_type VARCHAR(50) NOT NULL DEFAULT 'monthly',
    basic_salary NUMERIC(15, 2) NOT NULL DEFAULT 0,
    daily_wage NUMERIC(15, 2) NOT NULL DEFAULT 0,
    working_days INT NOT NULL DEFAULT 26,
    present_days INT NOT NULL DEFAULT 26,
    absent_days INT NOT NULL DEFAULT 0,
    absent_deduction NUMERIC(15, 2) NOT NULL DEFAULT 0,
    overtime_hours NUMERIC(6, 2) NOT NULL DEFAULT 0,
    overtime_rate_per_hour NUMERIC(10, 2) NOT NULL DEFAULT 0,
    overtime_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    piece_rate_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    allowances NUMERIC(15, 2) NOT NULL DEFAULT 0,
    gross_salary NUMERIC(15, 2) NOT NULL DEFAULT 0,
    advance_deduction NUMERIC(15, 2) NOT NULL DEFAULT 0,
    remaining_advance_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    tax_deduction NUMERIC(15, 2) NOT NULL DEFAULT 0,
    other_deductions NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_deductions NUMERIC(15, 2) NOT NULL DEFAULT 0,
    net_payable NUMERIC(15, 2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Paid
    payment_date DATE,
    payment_method VARCHAR(50) DEFAULT 'Bank Transfer',
    bank_name VARCHAR(100),
    account_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, payroll_month)
);

-- 9. PAYROLL DISBURSEMENT PAYMENTS
CREATE TABLE IF NOT EXISTS public.payroll_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_record_id UUID REFERENCES public.payroll_records(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Bank Transfer',
    bank_reference VARCHAR(100),
    paid_amount NUMERIC(15, 2) NOT NULL,
    paid_by VARCHAR(150) DEFAULT 'Finance Desk',
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_employees_number ON public.employees(employee_number);
CREATE INDEX IF NOT EXISTS idx_employees_cnic ON public.employees(cnic);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON public.employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON public.attendance_records(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_advances_emp ON public.employee_advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_month ON public.payroll_runs(payroll_month);
CREATE INDEX IF NOT EXISTS idx_payroll_rec_run ON public.payroll_records(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_rec_emp_month ON public.payroll_records(employee_id, payroll_month);

-- ==============================================================================
-- AUTOMATIC UPDATED_AT TRIGGER FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_employees_updated_at ON public.employees;
CREATE TRIGGER tr_employees_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- SUPABASE STORAGE BUCKET CONFIGURATION
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-docs', 'employee-docs', true)
ON CONFLICT (id) DO NOTHING;

-- RLS POLICIES FOR STORAGE
CREATE POLICY "Allow authenticated or anon upload to employee-docs"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'employee-docs');

CREATE POLICY "Allow public view from employee-docs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'employee-docs');

CREATE POLICY "Allow public delete from employee-docs"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'employee-docs');

-- ==============================================================================
-- 10. CLIENTS CRM TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. CLT-2026-001
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'Brand', -- Brand, Retailer, Wholesaler, Manufacturer, Importer, Distributor, Agent
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, prospect, on_hold, inactive
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    address TEXT,
    postal_code VARCHAR(50),
    website VARCHAR(150),
    primary_contact JSONB NOT NULL DEFAULT '{}',
    secondary_contact JSONB DEFAULT '{}',
    business_info JSONB DEFAULT '{}',
    commercial_info JSONB DEFAULT '{}',
    manufacturing_preferences JSONB DEFAULT '{}',
    portal_access JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 11. PRODUCTS CATALOG TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    style_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. HD-380-01
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL, -- hoodies, tshirts, joggers, jackets
    sam VARCHAR(50) NOT NULL DEFAULT '0',
    fabric_type VARCHAR(100) NOT NULL,
    gsm VARCHAR(50) NOT NULL,
    consumption_kg VARCHAR(50) NOT NULL DEFAULT '0',
    wastage_pct VARCHAR(50) NOT NULL DEFAULT '0',
    sizes TEXT[] NOT NULL DEFAULT '{}',
    bom_status VARCHAR(50) NOT NULL DEFAULT 'draft', -- verified, draft, pending
    production_status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, sample, queued, completed
    specs JSONB DEFAULT '{}',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 12. RAW MATERIALS MASTER TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.raw_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. MAT-FAB-001
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL, -- fabric, trims, labels, packaging
    color VARCHAR(50) NOT NULL,
    uom VARCHAR(50) NOT NULL, -- kg, meters, pieces, gross, rolls
    gsm VARCHAR(50),
    unit_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
    reorder_point NUMERIC(15, 2) NOT NULL DEFAULT 0,
    location VARCHAR(100) NOT NULL DEFAULT 'Main Bay',
    current_stock NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'normal', -- normal, low, critical
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 13. PURCHASE ORDERS (PROCUREMENT) TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. PO-2026-001
    supplier VARCHAR(150) NOT NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_date DATE NOT NULL,
    material VARCHAR(150) NOT NULL,
    material_id UUID REFERENCES public.raw_materials(id) ON DELETE SET NULL,
    quantity NUMERIC(15, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL DEFAULT 'kg',
    rate NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    payment_terms VARCHAR(50) NOT NULL DEFAULT 'adv_50', -- adv_50, net_30, cod, full_advance
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, confirmed, partial, received
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 14. INVENTORY ITEMS & WAREHOUSE TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    lot_number VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL, -- fabric, trims, packaging
    material_id UUID REFERENCES public.raw_materials(id) ON DELETE SET NULL,
    bay VARCHAR(50) NOT NULL,
    available_stock NUMERIC(15, 2) NOT NULL DEFAULT 0,
    allocated_stock NUMERIC(15, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    unit_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
    reorder_point NUMERIC(15, 2) NOT NULL DEFAULT 0,
    health VARCHAR(50) NOT NULL DEFAULT 'healthy', -- healthy, low, critical
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 15. STOCK MOVEMENTS AUDIT LOG TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    item_name VARCHAR(150) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    movement_type VARCHAR(50) NOT NULL, -- in, transfer, scrap, correction, issuance
    quantity NUMERIC(15, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    from_bay VARCHAR(50),
    to_bay VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 16. SALES ORDERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. ORD-2026-001
    client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT,
    client_display_id VARCHAR(50) NOT NULL,
    client_name VARCHAR(150) NOT NULL,
    client_country VARCHAR(100) NOT NULL,
    client_city VARCHAR(100),
    client_contact VARCHAR(100),
    client_email VARCHAR(150),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_deadline DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    order_type VARCHAR(50) NOT NULL DEFAULT 'Export Bulk Production',
    production_stage VARCHAR(50) NOT NULL DEFAULT 'Order Confirmed',
    priority VARCHAR(50) NOT NULL DEFAULT 'normal',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    payment_terms VARCHAR(100) NOT NULL DEFAULT '30% Advance, 70% LC at Sight',
    incoterms VARCHAR(50) NOT NULL DEFAULT 'FOB Karachi',
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    style_code VARCHAR(100) NOT NULL,
    style_name VARCHAR(150) NOT NULL,
    product_category VARCHAR(50) NOT NULL,
    fabric_details VARCHAR(255),
    target_gsm VARCHAR(50),
    colorway VARCHAR(100),
    size_breakdown JSONB NOT NULL DEFAULT '{}',
    pricing JSONB NOT NULL DEFAULT '{}',
    cost_estimate_id UUID,
    quotation_id UUID,
    production_job_id UUID,
    invoice_id UUID,
    special_instructions TEXT,
    packing_instructions TEXT,
    timeline JSONB NOT NULL DEFAULT '[]',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 17. QUOTATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. QT-2026-001
    client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT,
    client_display_id VARCHAR(50) NOT NULL,
    client_name VARCHAR(150) NOT NULL,
    client_country VARCHAR(100) NOT NULL,
    client_contact VARCHAR(100),
    client_email VARCHAR(150),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    quotation_type VARCHAR(50) NOT NULL DEFAULT 'Export Bulk Proposal',
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    style_code VARCHAR(100) NOT NULL,
    style_name VARCHAR(150) NOT NULL,
    product_category VARCHAR(50) NOT NULL,
    fabric_details VARCHAR(255),
    target_gsm VARCHAR(50),
    colorway VARCHAR(100),
    size_breakdown JSONB NOT NULL DEFAULT '{}',
    pricing JSONB NOT NULL DEFAULT '{}',
    payment_terms VARCHAR(100) NOT NULL DEFAULT '30% Advance, 70% LC at Sight',
    incoterms VARCHAR(50) NOT NULL DEFAULT 'FOB Karachi',
    target_delivery_lead_time VARCHAR(100),
    converted_to_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    converted_to_order_number VARCHAR(50),
    notes TEXT,
    timeline JSONB NOT NULL DEFAULT '[]',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 18. INVOICES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. INV-2026-001
    client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT,
    client_display_id VARCHAR(50) NOT NULL,
    client_name VARCHAR(150) NOT NULL,
    client_country VARCHAR(100) NOT NULL,
    client_city VARCHAR(100),
    client_contact VARCHAR(100),
    client_email VARCHAR(150),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    order_number VARCHAR(50),
    invoice_type VARCHAR(50) NOT NULL DEFAULT 'Export Commercial Invoice',
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    style_code VARCHAR(100),
    style_name VARCHAR(150),
    product_category VARCHAR(50),
    pricing JSONB NOT NULL DEFAULT '{}',
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    balance_due NUMERIC(15, 2) NOT NULL DEFAULT 0,
    payment_terms VARCHAR(100),
    incoterms VARCHAR(50),
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(100),
    swift_iban VARCHAR(100),
    payments JSONB NOT NULL DEFAULT '[]',
    timeline JSONB NOT NULL DEFAULT '[]',
    notes TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 19. COST ESTIMATES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cost_estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estimate_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. CST-2026-001
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    style_code VARCHAR(100) NOT NULL,
    style_name VARCHAR(150) NOT NULL,
    client_name VARCHAR(150) NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL,
    order_quantity INT NOT NULL DEFAULT 1,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    pricing_method VARCHAR(20) NOT NULL DEFAULT 'margin',
    target_percentage NUMERIC(5, 2) NOT NULL DEFAULT 25,
    exchange_rate NUMERIC(10, 2) NOT NULL DEFAULT 278.50,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    fabric_costs JSONB NOT NULL DEFAULT '[]',
    trim_costs JSONB NOT NULL DEFAULT '[]',
    process_costs JSONB NOT NULL DEFAULT '[]',
    cutting_cost JSONB NOT NULL DEFAULT '{}',
    labor_cost JSONB NOT NULL DEFAULT '{}',
    finishing_qa_cost JSONB NOT NULL DEFAULT '{}',
    packaging_cost JSONB NOT NULL DEFAULT '{}',
    overhead_cost JSONB NOT NULL DEFAULT '{}',
    logistics_cost JSONB NOT NULL DEFAULT '{}',
    totals JSONB NOT NULL DEFAULT '{}',
    linked_production_job_id VARCHAR(100),
    linked_production_job_number VARCHAR(100),
    notes TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 20. SYSTEM SETTINGS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 21. AI GENERATIONS & AI SETTINGS TABLES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ai_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt TEXT NOT NULL,
    style VARCHAR(50) NOT NULL,
    image_url TEXT NOT NULL,
    model VARCHAR(50) NOT NULL DEFAULT 'dall-e-3',
    dimensions VARCHAR(50) NOT NULL DEFAULT '1024x1024',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL DEFAULT 'OpenAI',
    model VARCHAR(50) NOT NULL DEFAULT 'dall-e-3',
    openai_api_key TEXT,
    image_size VARCHAR(50) NOT NULL DEFAULT '1024x1024',
    quality VARCHAR(50) NOT NULL DEFAULT 'standard',
    enable_auto_mockup BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_clients_code ON public.clients(client_code);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_products_code ON public.products(style_code);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_materials_code ON public.raw_materials(material_code);
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.raw_materials(category);
CREATE INDEX IF NOT EXISTS idx_purchases_number ON public.purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON public.stock_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_client ON public.orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_product ON public.orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_quotations_number ON public.quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotations_client ON public.quotations(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON public.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_costing_number ON public.cost_estimates(estimate_number);
CREATE INDEX IF NOT EXISTS idx_costing_product ON public.cost_estimates(product_id);
CREATE INDEX IF NOT EXISTS idx_settings_key ON public.system_settings(key);

-- ==============================================================================
-- AUTOMATIC UPDATED_AT TRIGGERS FOR ALL NEW TABLES
-- ==============================================================================
DROP TRIGGER IF EXISTS tr_clients_updated_at ON public.clients;
CREATE TRIGGER tr_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_products_updated_at ON public.products;
CREATE TRIGGER tr_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_raw_materials_updated_at ON public.raw_materials;
CREATE TRIGGER tr_raw_materials_updated_at BEFORE UPDATE ON public.raw_materials FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_purchase_orders_updated_at ON public.purchase_orders;
CREATE TRIGGER tr_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_inventory_items_updated_at ON public.inventory_items;
CREATE TRIGGER tr_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_orders_updated_at ON public.orders;
CREATE TRIGGER tr_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_quotations_updated_at ON public.quotations;
CREATE TRIGGER tr_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_invoices_updated_at ON public.invoices;
CREATE TRIGGER tr_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_cost_estimates_updated_at ON public.cost_estimates;
CREATE TRIGGER tr_cost_estimates_updated_at BEFORE UPDATE ON public.cost_estimates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER tr_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_ai_settings_updated_at ON public.ai_settings;
CREATE TRIGGER tr_ai_settings_updated_at BEFORE UPDATE ON public.ai_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 22. PRODUCTION JOBS (WORK ORDERS MASTER)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.production_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. PRD-2026-001
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    order_number VARCHAR(50) NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    client_name VARCHAR(150) NOT NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    style_code VARCHAR(100) NOT NULL,
    style_name VARCHAR(150) NOT NULL,
    cost_estimate_id UUID REFERENCES public.cost_estimates(id) ON DELETE SET NULL,
    planned_quantity INT NOT NULL CHECK (planned_quantity > 0),
    total_cut_quantity INT NOT NULL DEFAULT 0,
    total_stitched_quantity INT NOT NULL DEFAULT 0,
    total_finished_quantity INT NOT NULL DEFAULT 0,
    total_qa_passed_quantity INT NOT NULL DEFAULT 0,
    total_packed_quantity INT NOT NULL DEFAULT 0,
    total_rejected_quantity INT NOT NULL DEFAULT 0,
    total_rework_quantity INT NOT NULL DEFAULT 0,
    target_start_date DATE NOT NULL,
    target_end_date DATE NOT NULL,
    actual_start_date DATE,
    actual_end_date DATE,
    stage VARCHAR(50) NOT NULL DEFAULT 'planning', -- planning, cutting, stitching, finishing, qa, packed, completed
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, released, in_production, on_hold, completed, cancelled
    priority VARCHAR(30) NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
    assigned_line VARCHAR(50) DEFAULT 'line_1',
    supervisor_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    supervisor_name VARCHAR(150),
    standard_sam NUMERIC(8, 2) NOT NULL DEFAULT 0,
    size_breakdown JSONB NOT NULL DEFAULT '{}',
    colorways TEXT[] NOT NULL DEFAULT '{}',
    special_instructions TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 23. CUTTING PLANS & SIZE RATIOS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cutting_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. CUT-PLN-2026-001
    production_job_id UUID NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
    marker_name VARCHAR(100) NOT NULL,
    marker_length_meters NUMERIC(10, 2) NOT NULL DEFAULT 0,
    marker_width_cm NUMERIC(10, 2) NOT NULL DEFAULT 0,
    fabric_type VARCHAR(100) NOT NULL,
    fabric_gsm VARCHAR(50) NOT NULL,
    colorway VARCHAR(100) NOT NULL,
    plies_count INT NOT NULL DEFAULT 1,
    planned_lays INT NOT NULL DEFAULT 1,
    marker_efficiency_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, approved, issued, completed
    approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cutting_plan_sizes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cutting_plan_id UUID NOT NULL REFERENCES public.cutting_plans(id) ON DELETE CASCADE,
    size VARCHAR(30) NOT NULL,
    ratio INT NOT NULL DEFAULT 1,
    planned_quantity INT NOT NULL DEFAULT 0,
    actual_cut_quantity INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 24. PRODUCTION MATERIAL REQUISITIONS & ISSUES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.production_material_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. MAT-ISS-2026-001
    production_job_id UUID NOT NULL REFERENCES public.production_jobs(id) ON DELETE RESTRICT,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
    material_id UUID REFERENCES public.raw_materials(id) ON DELETE SET NULL,
    material_name VARCHAR(150) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    lot_number VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL, -- fabric, trims, labels, packaging
    from_bay VARCHAR(50) NOT NULL,
    to_stage VARCHAR(50) NOT NULL, -- cutting_floor, sewing_floor, finishing_bay, packing_bay
    standard_bom_qty NUMERIC(15, 2) NOT NULL DEFAULT 0,
    issued_quantity NUMERIC(15, 2) NOT NULL CHECK (issued_quantity > 0),
    returned_quantity NUMERIC(15, 2) NOT NULL DEFAULT 0,
    net_consumed_qty NUMERIC(15, 2) GENERATED ALWAYS AS (issued_quantity - returned_quantity) STORED,
    unit VARCHAR(50) NOT NULL,
    unit_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_cost NUMERIC(15, 2) GENERATED ALWAYS AS ((issued_quantity - returned_quantity) * unit_cost) STORED,
    stock_movement_id UUID REFERENCES public.stock_movements(id) ON DELETE SET NULL,
    issued_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    received_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 25. CUTTING EXECUTIONS (SPREADING & CUT RUNS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cutting_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cutting_plan_id UUID NOT NULL REFERENCES public.cutting_plans(id) ON DELETE CASCADE,
    production_job_id UUID NOT NULL REFERENCES public.production_jobs(id) ON DELETE RESTRICT,
    table_number VARCHAR(50) NOT NULL,
    actual_plies INT NOT NULL CHECK (actual_plies > 0),
    fabric_roll_numbers TEXT[] NOT NULL DEFAULT '{}',
    actual_cut_pieces INT NOT NULL CHECK (actual_cut_pieces >= 0),
    cut_waste_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
    cutter_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'completed', -- in_progress, completed, rejected
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ==============================================================================
-- 26. PRODUCTION BUNDLES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.production_bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bundle_barcode VARCHAR(100) UNIQUE NOT NULL, -- e.g. BND-2026-001-042
    production_job_id UUID NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
    cutting_execution_id UUID REFERENCES public.cutting_executions(id) ON DELETE SET NULL,
    bundle_number INT NOT NULL,
    size VARCHAR(30) NOT NULL,
    colorway VARCHAR(100) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    current_stage VARCHAR(50) NOT NULL DEFAULT 'cutting', -- cutting, stitching, finishing, qa, packed
    current_line VARCHAR(50) DEFAULT 'line_1',
    assigned_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    assigned_operation VARCHAR(150),
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- pending, in_progress, passed, rework, scrapped
    passed_pieces INT NOT NULL DEFAULT 0,
    rejected_pieces INT NOT NULL DEFAULT 0,
    rework_pieces INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 27. PRODUCTION LINES MASTER SETUP
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.production_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    line_code VARCHAR(50) UNIQUE NOT NULL,
    line_name VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL DEFAULT 'Stitching',
    supervisor_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    supervisor_name VARCHAR(150),
    shift VARCHAR(50) DEFAULT 'Morning',
    daily_target_capacity INT NOT NULL DEFAULT 600,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 28. SEWING LINE ALLOCATIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sewing_line_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    production_job_id UUID NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
    line_code VARCHAR(50) NOT NULL,
    line_name VARCHAR(100) NOT NULL,
    allocated_operators INT NOT NULL CHECK (allocated_operators > 0),
    target_daily_output INT NOT NULL CHECK (target_daily_output > 0),
    hourly_target INT NOT NULL DEFAULT 0,
    smv_per_garment NUMERIC(8, 2) NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- scheduled, active, completed, reassigned
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 29. OPERATOR PRODUCTION LOGS (PIECE-RATE TRACKING)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.operator_production_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    production_job_id UUID NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
    bundle_id UUID NOT NULL REFERENCES public.production_bundles(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
    employee_name VARCHAR(150) NOT NULL,
    operation_name VARCHAR(150) NOT NULL,
    pieces_completed INT NOT NULL CHECK (pieces_completed >= 0),
    pieces_rejected INT NOT NULL DEFAULT 0,
    pieces_rework INT NOT NULL DEFAULT 0,
    rate_per_piece NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_earnings NUMERIC(12, 2) GENERATED ALWAYS AS (pieces_completed * rate_per_piece) STORED,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift VARCHAR(50) DEFAULT 'General',
    payroll_month VARCHAR(20) NOT NULL, -- e.g. '2026-09'
    verified_by_supervisor UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 29. FINISHING & POST-PROCESSING LOGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.finishing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    production_job_id UUID NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
    bundle_id UUID REFERENCES public.production_bundles(id) ON DELETE SET NULL,
    operation_type VARCHAR(50) NOT NULL, -- thread_trimming, steam_pressing, folding, tagging
    quantity_processed INT NOT NULL CHECK (quantity_processed > 0),
    operator_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 29B. FINISHING OPERATIONS & BATCHES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.finishing_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. FIN-2026-001
    production_job_id UUID NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
    bundle_id UUID REFERENCES public.production_bundles(id) ON DELETE SET NULL,
    operation_type VARCHAR(100) NOT NULL, -- thread_trimming, washing, drying, garment_dyeing, softener_treatment, brushing, ironing, steam_press, folding, final_finishing
    received_quantity INT NOT NULL CHECK (received_quantity >= 0),
    processed_quantity INT NOT NULL DEFAULT 0 CHECK (processed_quantity >= 0),
    passed_quantity INT NOT NULL DEFAULT 0 CHECK (passed_quantity >= 0),
    rejected_quantity INT NOT NULL DEFAULT 0 CHECK (rejected_quantity >= 0),
    rework_quantity INT NOT NULL DEFAULT 0 CHECK (rework_quantity >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- pending, in_progress, completed, on_hold
    operator_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    operator_name VARCHAR(150),
    notes TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finishing_ops_job ON public.finishing_operations(production_job_id);
CREATE INDEX IF NOT EXISTS idx_finishing_ops_bundle ON public.finishing_operations(bundle_id);
CREATE INDEX IF NOT EXISTS idx_finishing_ops_status ON public.finishing_operations(status);

DROP TRIGGER IF EXISTS tr_finishing_operations_updated_at ON public.finishing_operations;
CREATE TRIGGER tr_finishing_operations_updated_at BEFORE UPDATE ON public.finishing_operations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.finishing_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all on finishing_operations" ON public.finishing_operations FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 29C. FINISHING INSPECTIONS & DEFECT LOGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.finishing_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. FIN-INS-2026-001
    production_job_id UUID NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
    finishing_operation_id UUID REFERENCES public.finishing_operations(id) ON DELETE CASCADE,
    bundle_id UUID REFERENCES public.production_bundles(id) ON DELETE SET NULL,
    inspected_quantity INT NOT NULL CHECK (inspected_quantity > 0),
    passed_quantity INT NOT NULL DEFAULT 0 CHECK (passed_quantity >= 0),
    rejected_quantity INT NOT NULL DEFAULT 0 CHECK (rejected_quantity >= 0),
    rework_quantity INT NOT NULL DEFAULT 0 CHECK (rework_quantity >= 0),
    defect_category VARCHAR(100), -- stain, uneven_press, thread_issue, measurement_issue, fabric_damage, washing_issue, color_shade_issue, packaging_prep, other
    defect_notes TEXT,
    inspector_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    inspector_name VARCHAR(150) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finishing_insp_job ON public.finishing_inspections(production_job_id);
CREATE INDEX IF NOT EXISTS idx_finishing_insp_op ON public.finishing_inspections(finishing_operation_id);

ALTER TABLE public.finishing_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all on finishing_inspections" ON public.finishing_inspections FOR ALL USING (true) WITH CHECK (true);


-- ==============================================================================
-- 30. QUALITY ASSURANCE INSPECTIONS & DEFECT LOGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.qa_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. QA-2026-001
    production_job_id UUID NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    bundle_id UUID REFERENCES public.production_bundles(id) ON DELETE SET NULL,
    inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    inspection_stage VARCHAR(50) NOT NULL DEFAULT 'aql_audit', -- inline_sewing, end_of_line, post_finishing, aql_audit, pre_shipment_audit
    inspection_type VARCHAR(50) NOT NULL DEFAULT 'AQL 2.5 Normal',
    inspection_level VARCHAR(20) NOT NULL DEFAULT 'Level II', -- Level I, Level II, Level III, S-1, S-2, S-3, S-4
    aql_level VARCHAR(20) NOT NULL DEFAULT '2.5', -- 1.0, 1.5, 2.5, 4.0, 6.5
    lot_quantity INT NOT NULL DEFAULT 0 CHECK (lot_quantity >= 0),
    sample_size INT NOT NULL DEFAULT 0 CHECK (sample_size >= 0),
    inspected_quantity INT NOT NULL DEFAULT 0 CHECK (inspected_quantity >= 0),
    passed_quantity INT NOT NULL DEFAULT 0 CHECK (passed_quantity >= 0),
    failed_pieces INT NOT NULL DEFAULT 0 CHECK (failed_pieces >= 0),
    rejected_quantity INT NOT NULL DEFAULT 0 CHECK (rejected_quantity >= 0),
    rework_quantity INT NOT NULL DEFAULT 0 CHECK (rework_quantity >= 0),
    scrapped_pieces INT NOT NULL DEFAULT 0 CHECK (scrapped_pieces >= 0),
    critical_defects INT NOT NULL DEFAULT 0 CHECK (critical_defects >= 0),
    major_defects INT NOT NULL DEFAULT 0 CHECK (major_defects >= 0),
    minor_defects INT NOT NULL DEFAULT 0 CHECK (minor_defects >= 0),
    max_allowed_major INT NOT NULL DEFAULT 0,
    max_allowed_minor INT NOT NULL DEFAULT 0,
    inspection_result VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, passed, failed, rework_required
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- draft, in_progress, passed, failed, rework_required, approved
    decision VARCHAR(50) NOT NULL DEFAULT 'pending', -- approved, rework_required, rejected, pending
    inspector_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    inspector_name VARCHAR(150) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qa_inspections_job ON public.qa_inspections(production_job_id);
CREATE INDEX IF NOT EXISTS idx_qa_inspections_order ON public.qa_inspections(order_id);
CREATE INDEX IF NOT EXISTS idx_qa_inspections_status ON public.qa_inspections(status);
CREATE INDEX IF NOT EXISTS idx_qa_inspections_result ON public.qa_inspections(inspection_result);

DROP TRIGGER IF EXISTS tr_qa_inspections_updated_at ON public.qa_inspections;
CREATE TRIGGER tr_qa_inspections_updated_at BEFORE UPDATE ON public.qa_inspections FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.qa_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all on qa_inspections" ON public.qa_inspections FOR ALL USING (true) WITH CHECK (true);

-- QA Defects (compatible with qa_defect_details)
CREATE TABLE IF NOT EXISTS public.qa_defects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qa_inspection_id UUID NOT NULL REFERENCES public.qa_inspections(id) ON DELETE CASCADE,
    defect_code VARCHAR(50) NOT NULL,
    defect_name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL, -- sewing, measurement, fabric, stain, hole, color_shade, print_embroidery, finishing, label_packaging, other
    severity VARCHAR(50) NOT NULL, -- CRITICAL, MAJOR, MINOR
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    responsible_operation VARCHAR(150),
    corrective_action_required TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qa_defects_inspection ON public.qa_defects(qa_inspection_id);
CREATE INDEX IF NOT EXISTS idx_qa_defects_category ON public.qa_defects(category);
CREATE INDEX IF NOT EXISTS idx_qa_defects_severity ON public.qa_defects(severity);

ALTER TABLE public.qa_defects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all on qa_defects" ON public.qa_defects FOR ALL USING (true) WITH CHECK (true);

-- QA Rework Records
CREATE TABLE IF NOT EXISTS public.qa_rework_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rework_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. RWK-2026-001
    qa_inspection_id UUID NOT NULL REFERENCES public.qa_inspections(id) ON DELETE CASCADE,
    production_job_id UUID NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
    bundle_id UUID REFERENCES public.production_bundles(id) ON DELETE SET NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    defect_reason TEXT NOT NULL,
    assigned_department VARCHAR(100) NOT NULL DEFAULT 'Finishing',
    due_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, scrapped
    completion_notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qa_rework_job ON public.qa_rework_records(production_job_id);
CREATE INDEX IF NOT EXISTS idx_qa_rework_inspection ON public.qa_rework_records(qa_inspection_id);
CREATE INDEX IF NOT EXISTS idx_qa_rework_status ON public.qa_rework_records(status);

DROP TRIGGER IF EXISTS tr_qa_rework_records_updated_at ON public.qa_rework_records;
CREATE TRIGGER tr_qa_rework_records_updated_at BEFORE UPDATE ON public.qa_rework_records FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.qa_rework_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all on qa_rework_records" ON public.qa_rework_records FOR ALL USING (true) WITH CHECK (true);


-- ==============================================================================
-- 31. PACKING RECORDS, CARTONIZATION & PACKING LISTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.packing_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    packing_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. PCK-2026-001
    production_job_id UUID NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    qa_approved_quantity INT NOT NULL DEFAULT 0 CHECK (qa_approved_quantity >= 0),
    packed_quantity INT NOT NULL DEFAULT 0 CHECK (packed_quantity >= 0),
    pending_quantity INT NOT NULL DEFAULT 0 CHECK (pending_quantity >= 0),
    total_cartons INT NOT NULL DEFAULT 0 CHECK (total_cartons >= 0),
    packing_status VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- in_progress, packed, completed, dispatch_ready
    packing_date DATE NOT NULL DEFAULT CURRENT_DATE,
    packer_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    packer_name VARCHAR(150),
    packing_method VARCHAR(50) NOT NULL DEFAULT 'single_polybag_master_carton',
    polybag_type VARCHAR(100),
    hangtag_verified BOOLEAN NOT NULL DEFAULT true,
    care_label_verified BOOLEAN NOT NULL DEFAULT true,
    barcode_sticker_verified BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packing_records_job ON public.packing_records(production_job_id);
CREATE INDEX IF NOT EXISTS idx_packing_records_order ON public.packing_records(order_id);
CREATE INDEX IF NOT EXISTS idx_packing_records_status ON public.packing_records(packing_status);

DROP TRIGGER IF EXISTS tr_packing_records_updated_at ON public.packing_records;
CREATE TRIGGER tr_packing_records_updated_at BEFORE UPDATE ON public.packing_records FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.packing_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all on packing_records" ON public.packing_records FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.packing_cartons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    packing_record_id UUID REFERENCES public.packing_records(id) ON DELETE CASCADE,
    carton_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. CTN-2026-001-001
    production_job_id UUID NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    carton_index INT NOT NULL DEFAULT 1,
    carton_barcode VARCHAR(100) UNIQUE NOT NULL,
    packing_type VARCHAR(50) NOT NULL DEFAULT 'solid_size', -- solid_size, ratio_assorted
    total_units_in_carton INT NOT NULL CHECK (total_units_in_carton > 0),
    size_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    gross_weight_kg NUMERIC(8, 2) NOT NULL DEFAULT 0,
    net_weight_kg NUMERIC(8, 2) NOT NULL DEFAULT 0,
    length_cm NUMERIC(8, 2) NOT NULL DEFAULT 60,
    width_cm NUMERIC(8, 2) NOT NULL DEFAULT 40,
    height_cm NUMERIC(8, 2) NOT NULL DEFAULT 35,
    destination_label VARCHAR(150),
    status VARCHAR(50) NOT NULL DEFAULT 'packed', -- packed, inspected, staged_for_dispatch, dispatched
    packed_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    packer_name VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packing_cartons_rec ON public.packing_cartons(packing_record_id);
CREATE INDEX IF NOT EXISTS idx_packing_cartons_job ON public.packing_cartons(production_job_id);
CREATE INDEX IF NOT EXISTS idx_packing_cartons_barcode ON public.packing_cartons(carton_barcode);
CREATE INDEX IF NOT EXISTS idx_packing_cartons_status ON public.packing_cartons(status);

DROP TRIGGER IF EXISTS tr_packing_cartons_updated_at ON public.packing_cartons;
CREATE TRIGGER tr_packing_cartons_updated_at BEFORE UPDATE ON public.packing_cartons FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.packing_cartons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all on packing_cartons" ON public.packing_cartons FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.packing_carton_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carton_id UUID NOT NULL REFERENCES public.packing_cartons(id) ON DELETE CASCADE,
    size VARCHAR(30) NOT NULL,
    colorway VARCHAR(100) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_packing_carton_items_cid ON public.packing_carton_items(carton_id);

ALTER TABLE public.packing_carton_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all on packing_carton_items" ON public.packing_carton_items FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 32. PRODUCTION AUDIT TIMELINE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.production_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    production_job_id UUID NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    actor VARCHAR(150) DEFAULT 'System',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- PRODUCTION INDEXES FOR QUERY & JOIN OPTIMIZATION
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_prod_jobs_number ON public.production_jobs(job_number);
CREATE INDEX IF NOT EXISTS idx_prod_jobs_order ON public.production_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_prod_jobs_client ON public.production_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_prod_jobs_product ON public.production_jobs(product_id);
CREATE INDEX IF NOT EXISTS idx_prod_jobs_stage ON public.production_jobs(stage);
CREATE INDEX IF NOT EXISTS idx_prod_jobs_status ON public.production_jobs(status);
CREATE INDEX IF NOT EXISTS idx_cutting_plans_job ON public.cutting_plans(production_job_id);
CREATE INDEX IF NOT EXISTS idx_material_issues_job ON public.production_material_issues(production_job_id);
CREATE INDEX IF NOT EXISTS idx_material_issues_item ON public.production_material_issues(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_bundles_job ON public.production_bundles(production_job_id);
CREATE INDEX IF NOT EXISTS idx_bundles_barcode ON public.production_bundles(bundle_barcode);
CREATE INDEX IF NOT EXISTS idx_bundles_stage ON public.production_bundles(current_stage);
CREATE INDEX IF NOT EXISTS idx_operator_logs_job ON public.operator_production_logs(production_job_id);
CREATE INDEX IF NOT EXISTS idx_operator_logs_emp ON public.operator_production_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_operator_logs_month ON public.operator_production_logs(payroll_month);
CREATE INDEX IF NOT EXISTS idx_qa_inspections_job ON public.qa_inspections(production_job_id);
CREATE INDEX IF NOT EXISTS idx_packing_cartons_job ON public.packing_cartons(production_job_id);
CREATE INDEX IF NOT EXISTS idx_packing_cartons_barcode ON public.packing_cartons(carton_barcode);
CREATE INDEX IF NOT EXISTS idx_prod_timeline_job ON public.production_timeline(production_job_id);

-- ==============================================================================
-- AUTOMATIC UPDATED_AT TRIGGERS FOR PRODUCTION TABLES
-- ==============================================================================
DROP TRIGGER IF EXISTS tr_production_jobs_updated_at ON public.production_jobs;
CREATE TRIGGER tr_production_jobs_updated_at BEFORE UPDATE ON public.production_jobs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_cutting_plans_updated_at ON public.cutting_plans;
CREATE TRIGGER tr_cutting_plans_updated_at BEFORE UPDATE ON public.cutting_plans FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_production_bundles_updated_at ON public.production_bundles;
CREATE TRIGGER tr_production_bundles_updated_at BEFORE UPDATE ON public.production_bundles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) FOR PRODUCTION MODULE
-- ==============================================================================
ALTER TABLE public.production_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cutting_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cutting_plan_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_material_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cutting_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sewing_line_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finishing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_defect_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_cartons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_carton_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all on production_jobs" ON public.production_jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on cutting_plans" ON public.cutting_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on cutting_plan_sizes" ON public.cutting_plan_sizes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on production_material_issues" ON public.production_material_issues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on cutting_executions" ON public.cutting_executions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on production_bundles" ON public.production_bundles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on sewing_line_allocations" ON public.sewing_line_allocations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on operator_production_logs" ON public.operator_production_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on finishing_logs" ON public.finishing_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on qa_inspections" ON public.qa_inspections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on qa_defect_details" ON public.qa_defect_details FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on packing_cartons" ON public.packing_cartons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on packing_carton_items" ON public.packing_carton_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on production_timeline" ON public.production_timeline FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 33. TRACKING & LOGISTICS SHIPMENTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tracking_shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. TRK-2026-001
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    order_number VARCHAR(50) NOT NULL,
    production_job_id UUID REFERENCES public.production_jobs(id) ON DELETE SET NULL,
    production_job_number VARCHAR(50),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name VARCHAR(150) NOT NULL,
    carrier VARCHAR(100) NOT NULL DEFAULT 'Factory Fleet (Domestic Trucking)',
    carrier_tracking_ref VARCHAR(150),
    origin VARCHAR(150) NOT NULL DEFAULT 'Factory Sialkot — Export Terminal',
    destination VARCHAR(150) NOT NULL,
    current_gate INT NOT NULL DEFAULT 1 CHECK (current_gate BETWEEN 1 AND 9),
    status VARCHAR(50) NOT NULL DEFAULT 'in_production', -- in_production, quality_audit, packed, dispatched, in_transit, delivered, delayed, archived
    batch_quantity INT NOT NULL DEFAULT 0,
    carton_count INT NOT NULL DEFAULT 0,
    estimated_delivery DATE NOT NULL,
    dispatched_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    carrier_payload JSONB NOT NULL DEFAULT '{}',
    exceptions JSONB NOT NULL DEFAULT '[]',
    notes TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_number ON public.tracking_shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_tracking_order ON public.tracking_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_tracking_job ON public.tracking_shipments(production_job_id);
CREATE INDEX IF NOT EXISTS idx_tracking_status ON public.tracking_shipments(status);
CREATE INDEX IF NOT EXISTS idx_tracking_gate ON public.tracking_shipments(current_gate);

DROP TRIGGER IF EXISTS tr_tracking_shipments_updated_at ON public.tracking_shipments;
CREATE TRIGGER tr_tracking_shipments_updated_at BEFORE UPDATE ON public.tracking_shipments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.tracking_shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all on tracking_shipments" ON public.tracking_shipments FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 34. DISPATCH, SHIPPING & EXPORT LOGISTICS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.dispatch_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispatch_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. DSP-2026-001
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    production_job_id UUID REFERENCES public.production_jobs(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    tracking_shipment_id UUID REFERENCES public.tracking_shipments(id) ON DELETE SET NULL,
    packing_record_id UUID REFERENCES public.packing_records(id) ON DELETE SET NULL,
    dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    warehouse_origin VARCHAR(150) NOT NULL DEFAULT 'Factory Sialkot — Export Staging Bay A-04',
    destination_country VARCHAR(100) NOT NULL DEFAULT 'United States',
    destination_city VARCHAR(100) NOT NULL DEFAULT 'New York',
    destination_address TEXT,
    consignee_name VARCHAR(150) NOT NULL,
    shipping_method VARCHAR(50) NOT NULL DEFAULT 'air_freight', -- air_freight, sea_freight, road_freight, express_courier
    carrier VARCHAR(100) NOT NULL DEFAULT 'Factory Fleet / Commercial Export Carrier',
    carrier_tracking_number VARCHAR(150),
    shipping_reference VARCHAR(150),
    vehicle_container_no VARCHAR(100),
    driver_name VARCHAR(100),
    driver_phone VARCHAR(50),
    total_cartons INT NOT NULL DEFAULT 0 CHECK (total_cartons >= 0),
    total_pieces INT NOT NULL DEFAULT 0 CHECK (total_pieces >= 0),
    total_net_weight_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_gross_weight_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
    dispatch_status VARCHAR(50) NOT NULL DEFAULT 'ready_for_dispatch', -- ready_for_dispatch, dispatch_scheduled, loaded, dispatched, in_transit, delivered, cancelled
    dispatched_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    dispatched_by_name VARCHAR(150),
    verified_by_name VARCHAR(150),
    verification_passed BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_number ON public.dispatch_records(dispatch_number);
CREATE INDEX IF NOT EXISTS idx_dispatch_order ON public.dispatch_records(order_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_job ON public.dispatch_records(production_job_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_client ON public.dispatch_records(client_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_status ON public.dispatch_records(dispatch_status);

DROP TRIGGER IF EXISTS tr_dispatch_records_updated_at ON public.dispatch_records;
CREATE TRIGGER tr_dispatch_records_updated_at BEFORE UPDATE ON public.dispatch_records FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.dispatch_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all on dispatch_records" ON public.dispatch_records FOR ALL USING (true) WITH CHECK (true);

-- Dispatch Cartons mapping table
CREATE TABLE IF NOT EXISTS public.dispatch_cartons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispatch_id UUID NOT NULL REFERENCES public.dispatch_records(id) ON DELETE CASCADE,
    carton_id UUID NOT NULL REFERENCES public.packing_cartons(id) ON DELETE CASCADE,
    carton_number VARCHAR(50) NOT NULL,
    carton_barcode VARCHAR(100) NOT NULL,
    total_units INT NOT NULL CHECK (total_units > 0),
    gross_weight_kg NUMERIC(8, 2) NOT NULL DEFAULT 0,
    net_weight_kg NUMERIC(8, 2) NOT NULL DEFAULT 0,
    size_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_loaded BOOLEAN NOT NULL DEFAULT false,
    loaded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_cartons_did ON public.dispatch_cartons(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_cartons_cid ON public.dispatch_cartons(carton_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_cartons_bar ON public.dispatch_cartons(carton_barcode);

ALTER TABLE public.dispatch_cartons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all on dispatch_cartons" ON public.dispatch_cartons FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 35. FINANCIAL ADJUSTMENTS & AUDIT LEDGER (PHASE 3.0)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.financial_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_type VARCHAR(50) NOT NULL, -- order, production_job, invoice, client, cost_estimate
    reference_id VARCHAR(100) NOT NULL,
    reference_number VARCHAR(100),
    category VARCHAR(50) NOT NULL, -- material_variance, labor_variance, overhead_adjustment, commercial_discount, currency_exchange_diff, tax_adjustment, manual_reconciliation
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    previous_value NUMERIC(15, 2) DEFAULT 0,
    new_value NUMERIC(15, 2) DEFAULT 0,
    reason TEXT NOT NULL,
    actor VARCHAR(150) NOT NULL DEFAULT 'Finance Manager',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_adj_ref ON public.financial_adjustments(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_financial_adj_cat ON public.financial_adjustments(category);

ALTER TABLE public.financial_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all on financial_adjustments" ON public.financial_adjustments FOR ALL USING (true) WITH CHECK (true);
