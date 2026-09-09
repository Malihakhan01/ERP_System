-- ==============================================================================
-- FactoryOS Garment ERP — Production MySQL 8 Complete Relational Database Schema
-- Architecture: Next.js 16 + Node.js MySQL2 + Laravel 13 (Shared / VPS Hosting)
-- Charset: utf8mb4 / Collation: utf8mb4_unicode_ci / Engine: InnoDB
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- -----------------------------------------------------------------------------
-- 1. USERS & AUTHENTICATION
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'viewer', -- super_admin, factory_manager, production_supervisor, qa_inspector, merchandiser, finance, operator
    `department` VARCHAR(100) NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `remember_token` VARCHAR(100) NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_role` (`role`),
    INDEX `idx_users_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed Data: Factory Operators & Roles
INSERT INTO `users` (`id`, `uuid`, `name`, `email`, `password`, `role`, `department`, `is_active`) VALUES
(1, 'e1a2b3c4-0001-4000-8000-000000000001', 'Factory Admin', 'admin@factoryos.internal', 'factoryadmin2026', 'super_admin', 'Executive Management', 1),
(2, 'e1a2b3c4-0002-4000-8000-000000000002', 'maliha', 'supervisor@factoryos.internal', '12345678', 'production_supervisor', 'Sewing & Finishing', 1),
(3, 'e1a2b3c4-0003-4000-8000-000000000003', 'Ayesha Siddiqui', 'finance@factoryos.internal', 'finance2026', 'finance', 'Finance & Commercial', 1),
(4, 'e1a2b3c4-0004-4000-8000-000000000004', 'Bilal Rasheed', 'warehouse@factoryos.internal', 'warehouse2026', 'factory_manager', 'Fabric & Material Storage', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `password` = VALUES(`password`), `role` = VALUES(`role`), `department` = VALUES(`department`);

-- -----------------------------------------------------------------------------
-- 2. CLIENTS (Commercial Buyers & Brands)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `clients`;
CREATE TABLE `clients` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `display_id` VARCHAR(50) NOT NULL UNIQUE, -- e.g. CLT-2026-001
    `company_name` VARCHAR(200) NOT NULL,
    `brand_name` VARCHAR(150) NULL,
    `country` VARCHAR(100) NOT NULL,
    `city` VARCHAR(100) NULL,
    `contact_person` VARCHAR(150) NULL,
    `email` VARCHAR(150) NULL,
    `phone` VARCHAR(50) NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
    `credit_limit` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `payment_terms` VARCHAR(150) NOT NULL DEFAULT '30% Advance TT, 70% LC at Sight',
    `tax_number` VARCHAR(100) NULL,
    `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_clients_country` (`country`),
    INDEX `idx_clients_archived` (`is_archived`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. PRODUCTS (Garment Tech Packs & Style Catalog)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `style_code` VARCHAR(50) NOT NULL UNIQUE, -- e.g. HD-380, TS-240
    `name` VARCHAR(200) NOT NULL,
    `category` VARCHAR(100) NOT NULL, -- hoodies, tshirts, joggers, jackets
    `sam` DECIMAL(8, 2) NOT NULL DEFAULT 0.00, -- Standard Allowed Minute
    `fabric_type` VARCHAR(150) NOT NULL,
    `gsm` VARCHAR(50) NOT NULL,
    `consumption_kg` DECIMAL(8, 4) NOT NULL DEFAULT 0.0000, -- per unit fabric consumption
    `wastage_pct` DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
    `sizes` JSON NOT NULL, -- ["XS", "S", "M", "L", "XL", "2XL"]
    `bom_status` VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, verified, approved
    `production_status` VARCHAR(50) NOT NULL DEFAULT 'active', -- active, sample, queued, completed
    `specs` JSON NULL,
    `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_products_category` (`category`),
    INDEX `idx_products_status` (`production_status`),
    INDEX `idx_products_archived` (`is_archived`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. RAW MATERIALS & INVENTORY CATALOG
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `raw_materials`;
CREATE TABLE `raw_materials` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `material_code` VARCHAR(50) NOT NULL UNIQUE, -- e.g. MAT-2026-001
    `name` VARCHAR(200) NOT NULL,
    `category` VARCHAR(50) NOT NULL DEFAULT 'fabric', -- fabric, trims, packaging, accessories
    `color` VARCHAR(100) NOT NULL DEFAULT 'Natural / Raw',
    `uom` VARCHAR(20) NOT NULL DEFAULT 'kg', -- kg, meters, yards, gross, pieces
    `gsm` VARCHAR(50) NULL,
    `unit_cost` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `reorder_point` DECIMAL(12, 2) NOT NULL DEFAULT 100.00,
    `location` VARCHAR(100) NOT NULL DEFAULT 'Main Warehouse Bay 1',
    `current_stock` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(50) NOT NULL DEFAULT 'normal', -- normal, low, critical
    `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_raw_materials_category` (`category`),
    INDEX `idx_raw_materials_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. QUOTATIONS & COMMERCIAL COST PROPOSALS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `quotations`;
CREATE TABLE `quotations` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `quotation_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. QTN-2026-001
    `client_id` BIGINT UNSIGNED NULL,
    `client_display_id` VARCHAR(50) DEFAULT 'CLT-2026-001',
    `client_name` VARCHAR(200) NOT NULL,
    `client_country` VARCHAR(100) DEFAULT 'United Kingdom',
    `client_contact` VARCHAR(150) NULL,
    `client_email` VARCHAR(150) NULL,
    `issue_date` DATE NULL,
    `valid_until` DATE NULL,
    `quotation_type` VARCHAR(100) DEFAULT 'Export Bulk Proposal',
    `currency` VARCHAR(10) DEFAULT 'USD',
    `status` VARCHAR(50) DEFAULT 'draft', -- draft, sent, accepted, rejected
    `style_code` VARCHAR(50) DEFAULT 'HD-001',
    `style_name` VARCHAR(200) DEFAULT 'Heavyweight Hoodie',
    `product_category` VARCHAR(100) DEFAULT 'Hoodies & Sweatshirts',
    `fabric_details` VARCHAR(255) DEFAULT '100% Combed Cotton Fleece',
    `target_gsm` VARCHAR(50) DEFAULT '320 GSM',
    `colorway` VARCHAR(100) DEFAULT 'Black',
    `quantity` INT UNSIGNED DEFAULT 1000,
    `unit_price` DECIMAL(15, 2) DEFAULT 14.50,
    `subtotal` DECIMAL(15, 2) DEFAULT 14500.00,
    `discount` DECIMAL(15, 2) DEFAULT 0.00,
    `freight_charges` DECIMAL(15, 2) DEFAULT 0.00,
    `tax` DECIMAL(15, 2) DEFAULT 0.00,
    `grand_total` DECIMAL(15, 2) DEFAULT 14500.00,
    `payment_terms` VARCHAR(150) DEFAULT '30% Advance TT / 70% LC at Sight',
    `incoterms` VARCHAR(100) DEFAULT 'FOB Sialkot / Karachi',
    `converted_to_order_number` VARCHAR(50) NULL,
    `notes` TEXT NULL,
    `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_quotations_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. SALES ORDERS (Customer Commercial Contracts)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `order_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. ORD-2026-001
    `client_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NULL,
    `client_name` VARCHAR(200) NOT NULL,
    `client_country` VARCHAR(100) NOT NULL,
    `style_code` VARCHAR(50) NOT NULL,
    `style_name` VARCHAR(200) NOT NULL,
    `product_category` VARCHAR(100) NOT NULL DEFAULT 'Hoodies & Sweatshirts',
    `order_date` DATE NOT NULL,
    `delivery_deadline` DATE NOT NULL,
    `order_type` VARCHAR(100) NOT NULL DEFAULT 'Export Bulk Production',
    `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
    `priority` VARCHAR(50) NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
    `status` VARCHAR(50) NOT NULL DEFAULT 'confirmed', -- draft, confirmed, in_production, qa, packed, shipped, completed, cancelled
    `production_stage` VARCHAR(100) NOT NULL DEFAULT 'Order Confirmed',
    `payment_status` VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, partially_paid, paid, overdue
    `fabric_details` VARCHAR(255) NULL,
    `target_gsm` VARCHAR(50) NULL,
    `colorway` VARCHAR(100) NULL,
    `quantity` INT UNSIGNED NOT NULL DEFAULT 0,
    `unit_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `discount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `additional_charges` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `tax` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `total_value` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `payment_terms` VARCHAR(150) NOT NULL DEFAULT '30% Advance TT / 70% before BL Release',
    `incoterms` VARCHAR(100) NOT NULL DEFAULT 'FOB Sialkot / Karachi',
    `shipping_method` VARCHAR(100) NULL,
    `destination_port` VARCHAR(150) NULL,
    `buyer_po_ref` VARCHAR(100) NULL,
    `special_instructions` TEXT NULL,
    `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
    INDEX `idx_orders_status` (`status`),
    INDEX `idx_orders_delivery` (`delivery_deadline`),
    INDEX `idx_orders_client` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. PROCUREMENT & PURCHASE ORDERS (Material Sourcing)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `purchases`;
CREATE TABLE `purchases` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `po_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. PO-2026-001
    `supplier` VARCHAR(200) NOT NULL,
    `order_date` DATE NULL,
    `expected_date` DATE NULL,
    `material` VARCHAR(200) NOT NULL,
    `material_id` BIGINT UNSIGNED NULL,
    `quantity` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `unit` VARCHAR(20) NOT NULL DEFAULT 'kg',
    `rate` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `paid_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `balance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `payment_terms` VARCHAR(50) DEFAULT 'adv_50',
    `status` VARCHAR(50) DEFAULT 'draft', -- draft, ordered, partial, received, cancelled
    `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_purchases_status` (`status`),
    INDEX `idx_purchases_supplier` (`supplier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. COMMERCIAL INVOICES & BILLING
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `invoices`;
CREATE TABLE `invoices` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `invoice_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. INV-2026-001
    `client_id` BIGINT UNSIGNED NULL,
    `client_display_id` VARCHAR(50) DEFAULT 'CLT-2026-001',
    `client_name` VARCHAR(200) NOT NULL,
    `client_country` VARCHAR(100) DEFAULT 'United Kingdom',
    `client_contact` VARCHAR(150) NULL,
    `client_email` VARCHAR(150) NULL,
    `order_id` BIGINT UNSIGNED NULL,
    `order_number` VARCHAR(50) NULL,
    `issue_date` DATE NULL,
    `due_date` DATE NULL,
    `invoice_type` VARCHAR(100) DEFAULT 'Export Commercial Invoice',
    `currency` VARCHAR(10) DEFAULT 'USD',
    `payment_terms` VARCHAR(150) DEFAULT '30% Advance TT / 70% LC at Sight',
    `incoterms` VARCHAR(100) DEFAULT 'FOB Sialkot / Karachi',
    `style_code` VARCHAR(50) DEFAULT 'HD-001',
    `style_name` VARCHAR(200) DEFAULT 'Heavyweight Hoodie',
    `quantity` INT UNSIGNED DEFAULT 1000,
    `unit_price` DECIMAL(15, 2) DEFAULT 14.50,
    `subtotal` DECIMAL(15, 2) DEFAULT 14500.00,
    `discount` DECIMAL(15, 2) DEFAULT 0.00,
    `freight_charges` DECIMAL(15, 2) DEFAULT 0.00,
    `tax` DECIMAL(15, 2) DEFAULT 0.00,
    `grand_total` DECIMAL(15, 2) DEFAULT 14500.00,
    `paid_amount` DECIMAL(15, 2) DEFAULT 0.00,
    `balance_due` DECIMAL(15, 2) DEFAULT 14500.00,
    `payment_status` VARCHAR(50) DEFAULT 'pending', -- pending, partially_paid, paid, overdue
    `status` VARCHAR(50) DEFAULT 'draft',
    `notes` TEXT NULL,
    `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_invoices_status` (`status`),
    INDEX `idx_invoices_payment` (`payment_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. COST ESTIMATES & PRE-COSTING BOM
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `cost_estimates`;
CREATE TABLE `cost_estimates` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `estimate_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. CST-2026-001
    `order_id` BIGINT UNSIGNED NULL,
    `product_id` BIGINT UNSIGNED NULL,
    `style_code` VARCHAR(50) NOT NULL,
    `style_name` VARCHAR(200) NOT NULL,
    `client_name` VARCHAR(200) NOT NULL,
    `client_id` BIGINT UNSIGNED NULL,
    `category` VARCHAR(100) NOT NULL DEFAULT 'Garments',
    `order_quantity` INT UNSIGNED NOT NULL DEFAULT 1,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
    `pricing_method` VARCHAR(50) NOT NULL DEFAULT 'margin',
    `target_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 25.00,
    `exchange_rate` DECIMAL(10, 4) NOT NULL DEFAULT 278.5000,
    `status` VARCHAR(50) NOT NULL DEFAULT 'draft',
    `fabric_costs` JSON NULL,
    `trim_costs` JSON NULL,
    `process_costs` JSON NULL,
    `cutting_cost` JSON NULL,
    `labor_cost` JSON NULL,
    `finishing_qa_cost` JSON NULL,
    `packaging_cost` JSON NULL,
    `overhead_cost` JSON NULL,
    `logistics_cost` JSON NULL,
    `totals` JSON NOT NULL,
    `linked_production_job_id` BIGINT UNSIGNED NULL,
    `linked_production_job_number` VARCHAR(50) NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. EMPLOYEES & WORKFORCE HR
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `employees`;
CREATE TABLE `employees` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `employee_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. EMP-2026-001
    `full_name` VARCHAR(150) NOT NULL,
    `father_name` VARCHAR(150) NULL,
    `cnic` VARCHAR(30) NULL,
    `phone` VARCHAR(50) NOT NULL,
    `phone_country_code` VARCHAR(10) NOT NULL DEFAULT '+92',
    `phone_number` VARCHAR(50) NOT NULL,
    `full_phone_number` VARCHAR(50) NOT NULL,
    `whatsapp_phone` VARCHAR(50) NULL,
    `whatsapp_country_code` VARCHAR(10) NULL DEFAULT '+92',
    `whatsapp_number` VARCHAR(50) NULL,
    `email` VARCHAR(150) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(100) NULL,
    `emergency_contact` VARCHAR(100) NULL,
    `emergency_contact_name` VARCHAR(150) NULL,
    `emergency_contact_phone` VARCHAR(50) NULL,
    `emergency_country_code` VARCHAR(10) NULL DEFAULT '+92',
    `emergency_phone_number` VARCHAR(50) NULL,
    `emergency_relation` VARCHAR(50) NULL,
    `joining_date` DATE NOT NULL,
    `department` VARCHAR(100) NOT NULL, -- cutting, stitching, quality, packing, maintenance, administration
    `designation` VARCHAR(150) NOT NULL,
    `employment_type` VARCHAR(50) NOT NULL DEFAULT 'Permanent',
    `status` VARCHAR(50) NOT NULL DEFAULT 'Active',
    `salary_type` VARCHAR(50) NOT NULL DEFAULT 'Monthly', -- Monthly, Daily, Piece_Rate
    `monthly_salary` DECIMAL(12, 2) NULL,
    `daily_rate` DECIMAL(12, 2) NULL,
    `piece_rate` DECIMAL(12, 2) NULL,
    `bank_name` VARCHAR(100) NULL,
    `account_number` VARCHAR(100) NULL,
    `payment_mode` VARCHAR(50) NOT NULL DEFAULT 'Bank Transfer',
    `skill_level` VARCHAR(50) NULL,
    `assigned_line` VARCHAR(50) NULL,
    `operation` VARCHAR(100) NULL,
    `shift` VARCHAR(50) NULL,
    `experience_years` DECIMAL(4, 1) NULL,
    `notes` TEXT NULL,
    `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_emp_dept` (`department`),
    INDEX `idx_emp_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. EMPLOYEE ADVANCES & LOANS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `employee_advances`;
CREATE TABLE `employee_advances` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `advance_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. ADV-2026-001
    `employee_id` BIGINT UNSIGNED NOT NULL,
    `requested_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `approved_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `monthly_deduction` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `remaining_balance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `repayment_months` INT UNSIGNED NOT NULL DEFAULT 1,
    `reason` VARCHAR(255) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, Fully_Deducted, Rejected
    `request_date` DATE NULL,
    `approved_date` DATE NULL,
    `disbursed_date` DATE NULL,
    `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 12. PAYROLL RUNS (Monthly Batch Processing)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `payroll_runs`;
CREATE TABLE `payroll_runs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `payroll_run_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. PRUN-2026-09
    `payroll_month` VARCHAR(10) NOT NULL, -- e.g. 2026-09
    `total_employees` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_gross_wages` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `total_piece_rate` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `total_overtime` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `total_deductions` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `total_net_payable` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(50) NOT NULL DEFAULT 'Processed', -- Processed, Approved, Disbursed
    `processed_by` VARCHAR(150) NOT NULL DEFAULT 'Payroll Officer',
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 13. PRODUCTION LINES & CAPACITY
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `production_lines`;
CREATE TABLE `production_lines` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `line_code` VARCHAR(50) NOT NULL UNIQUE, -- line_1, line_2, line_3, sample_room
    `name` VARCHAR(150) NOT NULL,
    `sewing_machines_count` INT UNSIGNED NOT NULL DEFAULT 25,
    `operators_count` INT UNSIGNED NOT NULL DEFAULT 28,
    `daily_target_capacity` INT UNSIGNED NOT NULL DEFAULT 600,
    `efficiency_target_pct` DECIMAL(5, 2) NOT NULL DEFAULT 85.00,
    `current_efficiency_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `current_job_id` BIGINT UNSIGNED NULL,
    `supervisor_id` BIGINT UNSIGNED NULL,
    `supervisor_name` VARCHAR(150) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'running', -- running, maintenance, idle
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 14. PRODUCTION JOBS & CUT-TO-PACK WORK ORDERS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `production_jobs`;
CREATE TABLE `production_jobs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `job_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. JOB-2026-001
    `order_id` BIGINT UNSIGNED NOT NULL,
    `order_number` VARCHAR(50) NOT NULL,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `client_name` VARCHAR(200) NOT NULL,
    `product_id` BIGINT UNSIGNED NULL,
    `style_code` VARCHAR(50) NOT NULL,
    `style_name` VARCHAR(200) NOT NULL,
    `cost_estimate_id` BIGINT UNSIGNED NULL,
    `planned_quantity` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_cut_quantity` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_stitched_quantity` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_finished_quantity` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_qa_passed_quantity` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_packed_quantity` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_rejected_quantity` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_rework_quantity` INT UNSIGNED NOT NULL DEFAULT 0,
    `target_start_date` DATE NOT NULL,
    `target_end_date` DATE NOT NULL,
    `actual_start_date` DATE NULL,
    `actual_end_date` DATE NULL,
    `stage` VARCHAR(50) NOT NULL DEFAULT 'planning', -- planning, cutting, stitching, finishing, qa, packed, completed
    `status` VARCHAR(50) NOT NULL DEFAULT 'released', -- draft, released, in_production, on_hold, completed, cancelled
    `priority` VARCHAR(50) NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
    `assigned_line` VARCHAR(50) NOT NULL DEFAULT 'line_1',
    `supervisor_id` BIGINT UNSIGNED NULL,
    `supervisor_name` VARCHAR(150) NULL,
    `standard_sam` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    `size_breakdown` JSON NOT NULL,
    `colorways` JSON NOT NULL,
    `special_instructions` TEXT NULL,
    `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
    INDEX `idx_jobs_stage` (`stage`),
    INDEX `idx_jobs_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 15. CUTTING PLANS & MARKER LAYOUTS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `cutting_plans`;
CREATE TABLE `cutting_plans` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `plan_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. CUT-2026-001
    `production_job_id` BIGINT UNSIGNED NOT NULL,
    `marker_name` VARCHAR(150) NOT NULL,
    `marker_length_meters` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    `marker_width_cm` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    `fabric_type` VARCHAR(150) NOT NULL,
    `fabric_gsm` VARCHAR(50) NOT NULL,
    `colorway` VARCHAR(100) NOT NULL,
    `plies_count` INT UNSIGNED NOT NULL DEFAULT 1,
    `total_layers` INT UNSIGNED NOT NULL DEFAULT 1,
    `planned_pieces` INT UNSIGNED NOT NULL DEFAULT 0,
    `actual_cut_pieces` INT UNSIGNED NOT NULL DEFAULT 0,
    `fabric_rolls_used` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_fabric_kg_used` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `table_number` VARCHAR(50) NOT NULL DEFAULT 'Table 1',
    `cutter_master_id` BIGINT UNSIGNED NULL,
    `cutter_master_name` VARCHAR(150) NOT NULL DEFAULT 'Master Cutter',
    `cutting_date` DATE NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, ready, in_progress, completed
    `notes` TEXT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`production_job_id`) REFERENCES `production_jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `cutting_plan_sizes`;
CREATE TABLE `cutting_plan_sizes` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `cutting_plan_id` BIGINT UNSIGNED NOT NULL,
    `size` VARCHAR(20) NOT NULL,
    `ratio` INT UNSIGNED NOT NULL DEFAULT 1,
    `pieces_per_layer` INT UNSIGNED NOT NULL DEFAULT 1,
    `total_planned_pieces` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_cut_pieces` INT UNSIGNED NOT NULL DEFAULT 0,
    FOREIGN KEY (`cutting_plan_id`) REFERENCES `cutting_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 16. WAREHOUSE INVENTORY & STOCK MOVEMENTS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `inventory_items`;
CREATE TABLE `inventory_items` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `name` VARCHAR(200) NOT NULL,
    `sku` VARCHAR(100) NOT NULL UNIQUE,
    `lot_number` VARCHAR(100) NOT NULL,
    `category` VARCHAR(50) NOT NULL, -- fabric, trims, packaging
    `material_id` BIGINT UNSIGNED NULL,
    `bay` VARCHAR(50) NOT NULL DEFAULT 'bay_1',
    `available_stock` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `allocated_stock` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `unit` VARCHAR(20) NOT NULL DEFAULT 'kg',
    `unit_cost` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `reorder_point` DECIMAL(12, 2) NOT NULL DEFAULT 100.00,
    `health` VARCHAR(50) NOT NULL DEFAULT 'healthy', -- healthy, low, critical
    `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_inv_bay` (`bay`),
    INDEX `idx_inv_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `stock_movements`;
CREATE TABLE `stock_movements` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `inventory_item_id` BIGINT UNSIGNED NOT NULL,
    `item_name` VARCHAR(200) NOT NULL,
    `sku` VARCHAR(100) NOT NULL,
    `movement_type` VARCHAR(50) NOT NULL, -- in, transfer, scrap, correction, issuance, issue
    `quantity` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `unit` VARCHAR(20) NOT NULL DEFAULT 'kg',
    `from_bay` VARCHAR(50) NULL,
    `to_bay` VARCHAR(50) NOT NULL,
    `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `notes` TEXT NULL,
    FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 17. PRODUCTION MATERIAL ISSUANCE & BUNDLE TICKETING
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `production_material_issues`;
CREATE TABLE `production_material_issues` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `issue_number` VARCHAR(50) NOT NULL UNIQUE,
    `production_job_id` BIGINT UNSIGNED NOT NULL,
    `inventory_item_id` BIGINT UNSIGNED NOT NULL,
    `material_name` VARCHAR(200) NOT NULL,
    `material_type` VARCHAR(50) NOT NULL,
    `issued_quantity` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `unit` VARCHAR(20) NOT NULL DEFAULT 'kg',
    `unit_cost` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `total_cost` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `issued_by` VARCHAR(150) NOT NULL DEFAULT 'Warehouse Supervisor',
    `received_by` VARCHAR(150) NOT NULL DEFAULT 'Line Supervisor',
    `stage` VARCHAR(50) NOT NULL DEFAULT 'cutting',
    `issued_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`production_job_id`) REFERENCES `production_jobs` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `production_bundles`;
CREATE TABLE `production_bundles` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `bundle_code` VARCHAR(50) NOT NULL UNIQUE, -- e.g. BND-2026-001-01
    `cutting_plan_id` BIGINT UNSIGNED NOT NULL,
    `production_job_id` BIGINT UNSIGNED NOT NULL,
    `size` VARCHAR(20) NOT NULL,
    `colorway` VARCHAR(100) NOT NULL,
    `quantity` INT UNSIGNED NOT NULL DEFAULT 1,
    `bundle_sequence` INT UNSIGNED NOT NULL DEFAULT 1,
    `qr_barcode` VARCHAR(100) NOT NULL UNIQUE,
    `current_stage` VARCHAR(50) NOT NULL DEFAULT 'cutting', -- cutting, stitching, finishing, qa, packed
    `assigned_line` VARCHAR(50) NOT NULL DEFAULT 'line_1',
    `assigned_operator_id` BIGINT UNSIGNED NULL,
    `assigned_operator_name` VARCHAR(150) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'created', -- created, issued, in_progress, completed, rejected
    `completed_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`cutting_plan_id`) REFERENCES `cutting_plans` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`production_job_id`) REFERENCES `production_jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 18. OPERATOR PIECE-RATE PRODUCTION LOGS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `operator_production_logs`;
CREATE TABLE `operator_production_logs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `production_bundle_id` BIGINT UNSIGNED NOT NULL,
    `production_job_id` BIGINT UNSIGNED NOT NULL,
    `employee_id` BIGINT UNSIGNED NOT NULL,
    `employee_name` VARCHAR(150) NOT NULL,
    `operation_code` VARCHAR(50) NOT NULL,
    `operation_name` VARCHAR(150) NOT NULL,
    `pieces_completed` INT UNSIGNED NOT NULL DEFAULT 0,
    `pieces_rejected` INT UNSIGNED NOT NULL DEFAULT 0,
    `pieces_rework` INT UNSIGNED NOT NULL DEFAULT 0,
    `piece_rate_pkr` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    `total_earnings` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `sam_earned` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    `line_code` VARCHAR(50) NOT NULL DEFAULT 'line_1',
    `logged_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`production_bundle_id`) REFERENCES `production_bundles` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`production_job_id`) REFERENCES `production_jobs` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 19. FINISHING, IRONING & POLYBAGGING
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `finishing_operations`;
CREATE TABLE `finishing_operations` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `operation_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. FIN-2026-001
    `production_job_id` BIGINT UNSIGNED NOT NULL,
    `stage_name` VARCHAR(100) NOT NULL DEFAULT 'Ironing & Steam Pressing',
    `pieces_processed` INT UNSIGNED NOT NULL DEFAULT 0,
    `pieces_passed` INT UNSIGNED NOT NULL DEFAULT 0,
    `pieces_failed` INT UNSIGNED NOT NULL DEFAULT 0,
    `operator_id` BIGINT UNSIGNED NULL,
    `operator_name` VARCHAR(150) NOT NULL DEFAULT 'Finishing Lead',
    `status` VARCHAR(50) NOT NULL DEFAULT 'in_progress',
    `processed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`production_job_id`) REFERENCES `production_jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 20. QUALITY ASSURANCE (QA), DEFECTS & REWORK
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `qa_inspections`;
CREATE TABLE `qa_inspections` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `inspection_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. QA-2026-001
    `production_job_id` BIGINT UNSIGNED NOT NULL,
    `production_bundle_id` BIGINT UNSIGNED NULL,
    `inspection_type` VARCHAR(100) NOT NULL DEFAULT 'End-Line Final Audit', -- Inline Checkpoint, End-Line Final Audit, AQL 2.5 Pre-Shipment
    `sample_size` INT UNSIGNED NOT NULL DEFAULT 20,
    `inspected_pieces` INT UNSIGNED NOT NULL DEFAULT 20,
    `passed_pieces` INT UNSIGNED NOT NULL DEFAULT 19,
    `failed_pieces` INT UNSIGNED NOT NULL DEFAULT 1,
    `rework_pieces` INT UNSIGNED NOT NULL DEFAULT 1,
    `critical_defects` INT UNSIGNED NOT NULL DEFAULT 0,
    `major_defects` INT UNSIGNED NOT NULL DEFAULT 1,
    `minor_defects` INT UNSIGNED NOT NULL DEFAULT 0,
    `decision` VARCHAR(50) NOT NULL DEFAULT 'passed', -- passed, conditionally_passed, rejected, rework_required
    `inspector_id` BIGINT UNSIGNED NULL,
    `inspector_name` VARCHAR(150) NOT NULL DEFAULT 'QA Lead Inspector',
    `inspection_date` DATE NOT NULL,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`production_job_id`) REFERENCES `production_jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `qa_defect_details`;
CREATE TABLE `qa_defect_details` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `qa_inspection_id` BIGINT UNSIGNED NOT NULL,
    `defect_code` VARCHAR(50) NOT NULL, -- e.g. DEF-ST-01
    `defect_name` VARCHAR(150) NOT NULL,
    `defect_category` VARCHAR(50) NOT NULL, -- critical, major, minor
    `defect_count` INT UNSIGNED NOT NULL DEFAULT 1,
    `responsible_operation` VARCHAR(150) NULL,
    `corrective_action` TEXT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`qa_inspection_id`) REFERENCES `qa_inspections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `qa_rework_records`;
CREATE TABLE `qa_rework_records` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `rework_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. RWK-2026-001
    `qa_inspection_id` BIGINT UNSIGNED NOT NULL,
    `production_job_id` BIGINT UNSIGNED NOT NULL,
    `rework_quantity` INT UNSIGNED NOT NULL DEFAULT 1,
    `defect_summary` VARCHAR(255) NOT NULL,
    `assigned_line` VARCHAR(50) NOT NULL DEFAULT 'line_1',
    `status` VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- pending, in_progress, completed, scrapped
    `completion_notes` TEXT NULL,
    `completed_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`qa_inspection_id`) REFERENCES `qa_inspections` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`production_job_id`) REFERENCES `production_jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 21. MASTER PACKING CARTONS & BARCODES
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `packing_cartons`;
CREATE TABLE `packing_cartons` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `carton_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. CTN-2026-001-001
    `production_job_id` BIGINT UNSIGNED NOT NULL,
    `carton_index` INT UNSIGNED NOT NULL DEFAULT 1,
    `carton_barcode` VARCHAR(50) NOT NULL UNIQUE,
    `packing_type` VARCHAR(100) NOT NULL DEFAULT 'Master Solid Carton',
    `total_units_in_carton` INT UNSIGNED NOT NULL DEFAULT 24,
    `gross_weight_kg` DECIMAL(8, 2) NOT NULL DEFAULT 12.50,
    `net_weight_kg` DECIMAL(8, 2) NOT NULL DEFAULT 11.20,
    `length_cm` DECIMAL(8, 2) NOT NULL DEFAULT 60.00,
    `width_cm` DECIMAL(8, 2) NOT NULL DEFAULT 40.00,
    `height_cm` DECIMAL(8, 2) NOT NULL DEFAULT 35.00,
    `status` VARCHAR(50) NOT NULL DEFAULT 'packed', -- packed, inspected, staged_for_dispatch, dispatched
    `packed_by` VARCHAR(150) NOT NULL DEFAULT 'Packing Floor Lead',
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`production_job_id`) REFERENCES `production_jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `packing_carton_items`;
CREATE TABLE `packing_carton_items` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `carton_id` BIGINT UNSIGNED NOT NULL,
    `size` VARCHAR(20) NOT NULL,
    `colorway` VARCHAR(100) NOT NULL DEFAULT 'Standard',
    `quantity` INT UNSIGNED NOT NULL DEFAULT 24,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`carton_id`) REFERENCES `packing_cartons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 22. EXPORT DISPATCH & SHIPPING MANIFESTS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `dispatch_notes`;
CREATE TABLE `dispatch_notes` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `dispatch_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. DSP-2026-001
    `order_id` BIGINT UNSIGNED NOT NULL,
    `carrier_name` VARCHAR(150) NOT NULL,
    `tracking_ref` VARCHAR(100) NULL,
    `container_number` VARCHAR(100) NULL,
    `seal_number` VARCHAR(100) NULL,
    `total_cartons` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_pieces` INT UNSIGNED NOT NULL DEFAULT 0,
    `gross_weight_kg` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `shipping_method` VARCHAR(100) NOT NULL DEFAULT 'Sea Freight (FCL)',
    `status` VARCHAR(50) NOT NULL DEFAULT 'ready_for_dispatch', -- ready_for_dispatch, dispatch_scheduled, loaded, dispatched, in_transit, delivered
    `destination_port` VARCHAR(150) NULL,
    `dispatched_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 23. 9-GATE MILESTONE TRACKING
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `tracking_records`;
CREATE TABLE `tracking_records` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `tracking_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. TRK-2026-001
    `order_id` BIGINT UNSIGNED NOT NULL,
    `production_job_id` BIGINT UNSIGNED NULL,
    `current_gate` INT UNSIGNED NOT NULL DEFAULT 1, -- Gate 1 to 9
    `gate_status` VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- in_progress, passed, exception, on_hold
    `origin_facility` VARCHAR(150) NOT NULL DEFAULT 'Main Garment Plant Sialkot',
    `destination_port` VARCHAR(150) NOT NULL,
    `current_location` VARCHAR(150) NOT NULL DEFAULT 'Factory Floor',
    `estimated_delivery` DATE NOT NULL,
    `actual_delivery` DATE NULL,
    `is_delayed` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`production_job_id`) REFERENCES `production_jobs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `tracking_timeline`;
CREATE TABLE `tracking_timeline` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `tracking_record_id` BIGINT UNSIGNED NOT NULL,
    `gate_number` INT UNSIGNED NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `description` TEXT NOT NULL,
    `location` VARCHAR(150) NOT NULL,
    `actor` VARCHAR(150) NOT NULL DEFAULT 'System Milestone Dispatcher',
    `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`tracking_record_id`) REFERENCES `tracking_records` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 24. PAYROLL RECORDS (Individual Payslips)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `payroll_records`;
CREATE TABLE `payroll_records` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `payroll_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. PAY-2026-09-001
    `employee_id` BIGINT UNSIGNED NOT NULL,
    `payroll_month` VARCHAR(10) NOT NULL, -- e.g. 2026-09
    `base_salary` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `piece_rate_earnings` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `overtime_earnings` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `advance_deductions` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `tax_deductions` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `net_payable` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, approved, paid
    `generated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 25. SYSTEM DOCUMENTS & PRIVATE FILE STORAGE METADATA
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `system_documents`;
CREATE TABLE `system_documents` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `document_type` VARCHAR(50) NOT NULL, -- tech_pack, employee_doc, export_manifest, qa_report
    `entity_type` VARCHAR(100) NOT NULL, -- products, employees, dispatch_notes, qa_inspections
    `entity_id` BIGINT UNSIGNED NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL, -- storage/app/private/employee-docs/xyz.pdf
    `file_size_bytes` BIGINT UNSIGNED NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `uploaded_by` VARCHAR(150) NOT NULL DEFAULT 'Admin',
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_docs_entity` (`entity_type`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 26. QUEUE JOBS & BACKGROUND TASK RUNNERS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `jobs`;
CREATE TABLE `jobs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `queue` VARCHAR(255) NOT NULL,
    `payload` LONGTEXT NOT NULL,
    `attempts` TINYINT UNSIGNED NOT NULL,
    `reserved_at` INT UNSIGNED NULL,
    `available_at` INT UNSIGNED NOT NULL,
    `created_at` INT UNSIGNED NOT NULL,
    INDEX `idx_jobs_queue` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `failed_jobs`;
CREATE TABLE `failed_jobs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` VARCHAR(255) NOT NULL UNIQUE,
    `connection` TEXT NOT NULL,
    `queue` TEXT NOT NULL,
    `payload` LONGTEXT NOT NULL,
    `exception` LONGTEXT NOT NULL,
    `failed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 27. SYSTEM SETTINGS & CONFIGURATION
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(100) NOT NULL UNIQUE,
    `value` JSON NOT NULL,
    `updated_by` VARCHAR(150) NULL DEFAULT 'System Admin',
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_settings_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `system_settings` (`key`, `value`) VALUES
('company_profile', '{"companyName":"FactoryOS Garments Ltd.","ntnNumber":"8912401-7","strnNumber":"32-77-8912-401-19","currency":"PKR","shift1Time":"08:00 - 17:00","shift2Time":"17:00 - 01:00","activeLinesCount":"6","maxAdvancePercent":"200","maxRepaymentMonths":"12","invoicePrefix":"INV-2026-","quotationPrefix":"QTN-2026-","bankAccount":"Habib Bank Limited — A/C 019283746501"}')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

-- -----------------------------------------------------------------------------
-- 28. AUDIT LOGS & SYSTEM ACTIVITY
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NULL,
    `user_email` VARCHAR(150) NULL,
    `action` VARCHAR(100) NOT NULL,
    `module` VARCHAR(50) NOT NULL,
    `entity_id` VARCHAR(100) NULL,
    `details` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_audit_module` (`module`),
    INDEX `idx_audit_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 29. EMPLOYEE TASKS & OPERATIONAL ASSIGNMENTS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `employee_tasks`;
CREATE TABLE `employee_tasks` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `task_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. TSK-2026-001
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `task_type` VARCHAR(50) NOT NULL DEFAULT 'general', -- stitching, cutting, qa_inspection, packing, maintenance, machine_setup, general
    `priority` VARCHAR(20) NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
    `status` VARCHAR(30) NOT NULL DEFAULT 'assigned', -- assigned, in_progress, completed, cancelled
    `assigned_to_employee_id` BIGINT UNSIGNED NOT NULL,
    `assigned_to_name` VARCHAR(150) NOT NULL,
    `assigned_by_user_id` BIGINT UNSIGNED NULL,
    `assigned_by_name` VARCHAR(150) NOT NULL DEFAULT 'Factory Admin',
    `order_id` BIGINT UNSIGNED NULL,
    `production_job_id` BIGINT UNSIGNED NULL,
    `due_date` DATE NOT NULL,
    `due_time` VARCHAR(20) NULL,
    `completed_at` TIMESTAMP NULL,
    `completion_notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_task_employee` (`assigned_to_employee_id`),
    INDEX `idx_task_status` (`status`),
    INDEX `idx_task_priority` (`priority`),
    FOREIGN KEY (`assigned_to_employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 30. LIVE USER CHAT, CHANNELS & TEAM MESSAGING
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `chat_messages`;
DROP TABLE IF EXISTS `chat_participants`;
DROP TABLE IF EXISTS `chat_conversations`;

CREATE TABLE `chat_conversations` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `type` ENUM('direct', 'channel') NOT NULL DEFAULT 'direct',
    `title` VARCHAR(150) NULL,
    `description` VARCHAR(255) NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `chat_participants` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `conversation_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `last_read_message_id` BIGINT UNSIGNED NULL,
    `last_read_at` TIMESTAMP NULL,
    `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uniq_conv_user` (`conversation_id`, `user_id`),
    FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `chat_messages` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `conversation_id` BIGINT UNSIGNED NOT NULL,
    `sender_id` BIGINT UNSIGNED NOT NULL,
    `message` TEXT NOT NULL,
    `message_type` VARCHAR(20) NOT NULL DEFAULT 'text',
    `attachment_url` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_conv_created` (`conversation_id`, `created_at`),
    FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

