-- ==============================================================================
-- FactoryOS Garment ERP — MySQL 8 Production Database Schema
-- Architecture: Next.js 16 + Laravel 13 + MySQL 8 (Hostinger Shared Hosting)
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
(2, 'e1a2b3c4-0002-4000-8000-000000000002', 'Tariq Mahmood', 'supervisor@factoryos.internal', 'supervisor2026', 'production_supervisor', 'Sewing & Finishing', 1),
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
-- 4. SALES ORDERS (Commercial Customer Contracts)
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
-- 5. COST ESTIMATES & PRE-COSTING BOM
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `cost_estimates`;
CREATE TABLE `cost_estimates` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `estimate_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. CST-2026-001
    `order_id` BIGINT UNSIGNED NULL,
    `product_id` BIGINT UNSIGNED NULL,
    `style_code` VARCHAR(50) NOT NULL,
    `batch_quantity` INT UNSIGNED NOT NULL DEFAULT 500,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
    `fabric_cost_total` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `trim_cost_total` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `process_cost_total` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `labor_cost_total` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `overhead_cost_total` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `packaging_cost_total` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `factory_cost_per_pc` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `net_margin_pct` DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
    `fob_price_per_pc` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `total_contract_value` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(50) NOT NULL DEFAULT 'approved', -- draft, review, approved, locked, archived
    `details_json` JSON NULL,
    `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
    INDEX `idx_costing_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. EMPLOYEES & WORKFORCE
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `employees`;
CREATE TABLE `employees` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `employee_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. EMP-2026-001
    `full_name` VARCHAR(150) NOT NULL,
    `father_name` VARCHAR(150) NULL,
    `cnic` VARCHAR(30) NULL UNIQUE,
    `phone` VARCHAR(50) NOT NULL,
    `email` VARCHAR(150) NULL,
    `joining_date` DATE NOT NULL,
    `department` VARCHAR(100) NOT NULL, -- Cutting, Stitching, Finishing, QA, Packing, Maintenance, Accounts
    `designation` VARCHAR(150) NOT NULL,
    `employment_type` VARCHAR(50) NOT NULL DEFAULT 'Permanent', -- Permanent, Contract, Piece-Rate
    `status` VARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, On Leave, Resigned, Terminated
    `salary_type` VARCHAR(50) NOT NULL DEFAULT 'monthly', -- monthly, daily, piece_rate
    `monthly_salary` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `daily_rate` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `piece_rate` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `assigned_line` VARCHAR(100) NULL,
    `skill_level` VARCHAR(50) NULL DEFAULT 'Skilled',
    `shift` VARCHAR(50) NOT NULL DEFAULT 'Morning',
    `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_employees_dept` (`department`),
    INDEX `idx_employees_status` (`status`),
    INDEX `idx_employees_archived` (`is_archived`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. PRODUCTION LINES
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `production_lines`;
CREATE TABLE `production_lines` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `line_code` VARCHAR(50) NOT NULL UNIQUE, -- line_1, line_2, line_3, sample_room
    `line_name` VARCHAR(100) NOT NULL,
    `department` VARCHAR(100) NOT NULL DEFAULT 'Stitching',
    `daily_target_capacity` INT UNSIGNED NOT NULL DEFAULT 600,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. PRODUCTION WORK ORDERS (Floor Jobs)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `production_jobs`;
CREATE TABLE `production_jobs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `job_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. PRD-2026-001
    `order_id` BIGINT UNSIGNED NOT NULL,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NULL,
    `order_number` VARCHAR(50) NOT NULL,
    `client_name` VARCHAR(200) NOT NULL,
    `style_code` VARCHAR(50) NOT NULL,
    `style_name` VARCHAR(200) NOT NULL,
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
    `stage` VARCHAR(50) NOT NULL DEFAULT 'planning', -- planning, material_ready, cutting, ready_for_stitching, stitching, finishing, qa, packed, completed
    `status` VARCHAR(50) NOT NULL DEFAULT 'released', -- draft, released, in_production, on_hold, completed, cancelled
    `priority` VARCHAR(50) NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
    `assigned_line` VARCHAR(50) NOT NULL DEFAULT 'line_1',
    `supervisor_id` BIGINT UNSIGNED NULL,
    `supervisor_name` VARCHAR(150) NULL,
    `standard_sam` DECIMAL(8, 2) NOT NULL DEFAULT 18.50,
    `size_breakdown` JSON NOT NULL, -- {"S": 100, "M": 150, "L": 150, "XL": 100}
    `colorways` JSON NULL,
    `special_instructions` TEXT NULL,
    `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`supervisor_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
    INDEX `idx_jobs_stage` (`stage`),
    INDEX `idx_jobs_status` (`status`),
    INDEX `idx_jobs_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. CAD CUTTING PLANS & SIZES
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `cutting_plans`;
CREATE TABLE `cutting_plans` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `plan_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. CUT-2026-001-01
    `production_job_id` BIGINT UNSIGNED NOT NULL,
    `marker_name` VARCHAR(100) NOT NULL,
    `marker_length_meters` DECIMAL(8, 2) NOT NULL DEFAULT 6.20,
    `marker_width_cm` DECIMAL(8, 2) NOT NULL DEFAULT 150.00,
    `fabric_type` VARCHAR(150) NOT NULL,
    `fabric_gsm` VARCHAR(50) NOT NULL,
    `colorway` VARCHAR(100) NOT NULL DEFAULT 'Standard',
    `plies_count` INT UNSIGNED NOT NULL DEFAULT 20,
    `planned_lays` INT UNSIGNED NOT NULL DEFAULT 1,
    `marker_efficiency_pct` DECIMAL(5, 2) NOT NULL DEFAULT 88.50,
    `status` VARCHAR(50) NOT NULL DEFAULT 'approved', -- draft, approved, issued, completed
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
    `planned_quantity` INT UNSIGNED NOT NULL DEFAULT 0,
    `actual_cut_quantity` INT UNSIGNED NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`cutting_plan_id`) REFERENCES `cutting_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. INVENTORY ITEMS & WAREHOUSE
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `inventory_items`;
CREATE TABLE `inventory_items` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `sku` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(200) NOT NULL,
    `category` VARCHAR(100) NOT NULL, -- fabric, trims, packaging, chemicals
    `unit` VARCHAR(20) NOT NULL DEFAULT 'kg', -- kg, meters, yards, pcs, gross
    `unit_cost` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `total_stock` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `available_stock` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `allocated_stock` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `min_reorder_level` DECIMAL(12, 2) NOT NULL DEFAULT 100.00,
    `bay` VARCHAR(50) NOT NULL DEFAULT 'Bay A-01',
    `lot_number` VARCHAR(100) NULL,
    `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_inventory_sku` (`sku`),
    INDEX `idx_inventory_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. STOCK MOVEMENTS (Audited Inventory Ledger)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `stock_movements`;
CREATE TABLE `stock_movements` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `movement_number` VARCHAR(50) NOT NULL UNIQUE,
    `inventory_item_id` BIGINT UNSIGNED NOT NULL,
    `movement_type` VARCHAR(50) NOT NULL, -- purchase_receipt, production_issue, return_to_stock, damage_adjustment
    `quantity` DECIMAL(12, 2) NOT NULL,
    `previous_stock` DECIMAL(12, 2) NOT NULL,
    `new_stock` DECIMAL(12, 2) NOT NULL,
    `reference_type` VARCHAR(100) NULL, -- production_jobs, purchase_orders, adjustments
    `reference_id` VARCHAR(100) NULL,
    `actor` VARCHAR(150) NOT NULL DEFAULT 'Warehouse Lead',
    `notes` TEXT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE,
    INDEX `idx_movements_item` (`inventory_item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 12. PRODUCTION MATERIAL ISSUES
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `production_material_issues`;
CREATE TABLE `production_material_issues` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `issue_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. ISS-882190
    `production_job_id` BIGINT UNSIGNED NOT NULL,
    `inventory_item_id` BIGINT UNSIGNED NOT NULL,
    `material_name` VARCHAR(200) NOT NULL,
    `sku` VARCHAR(50) NOT NULL,
    `lot_number` VARCHAR(100) NULL,
    `category` VARCHAR(100) NOT NULL DEFAULT 'fabric',
    `from_bay` VARCHAR(50) NOT NULL DEFAULT 'Bay A-01',
    `to_stage` VARCHAR(50) NOT NULL DEFAULT 'cutting_floor', -- cutting_floor, sewing_floor, finishing_bay, packing_bay
    `standard_bom_qty` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `issued_quantity` DECIMAL(12, 2) NOT NULL,
    `returned_quantity` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `unit` VARCHAR(20) NOT NULL DEFAULT 'kg',
    `unit_cost` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `total_cost` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`production_job_id`) REFERENCES `production_jobs` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 13. PRODUCTION QR BUNDLES
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `production_bundles`;
CREATE TABLE `production_bundles` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `bundle_barcode` VARCHAR(50) NOT NULL UNIQUE, -- e.g. BND-2026-001-S-01
    `production_job_id` BIGINT UNSIGNED NOT NULL,
    `bundle_number` INT UNSIGNED NOT NULL,
    `size` VARCHAR(20) NOT NULL,
    `colorway` VARCHAR(100) NOT NULL DEFAULT 'Standard',
    `quantity` INT UNSIGNED NOT NULL DEFAULT 25,
    `current_stage` VARCHAR(50) NOT NULL DEFAULT 'cutting', -- cutting, stitching, finishing, qa, packed
    `current_line` VARCHAR(50) NOT NULL DEFAULT 'line_1',
    `assigned_employee_id` BIGINT UNSIGNED NULL,
    `assigned_employee_name` VARCHAR(150) NULL,
    `assigned_operation` VARCHAR(150) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'created', -- pending, created, ready_for_stitching, in_progress, passed, rework, rejected, completed
    `passed_pieces` INT UNSIGNED NOT NULL DEFAULT 0,
    `rejected_pieces` INT UNSIGNED NOT NULL DEFAULT 0,
    `rework_pieces` INT UNSIGNED NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`production_job_id`) REFERENCES `production_jobs` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`assigned_employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
    INDEX `idx_bundles_barcode` (`bundle_barcode`),
    INDEX `idx_bundles_job` (`production_job_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 14. OPERATOR PRODUCTION LOGS (Piece-Rate Earnings)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `operator_production_logs`;
CREATE TABLE `operator_production_logs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `production_job_id` BIGINT UNSIGNED NOT NULL,
    `bundle_id` BIGINT UNSIGNED NOT NULL,
    `employee_id` BIGINT UNSIGNED NOT NULL,
    `employee_name` VARCHAR(150) NOT NULL,
    `operation_name` VARCHAR(150) NOT NULL,
    `pieces_completed` INT UNSIGNED NOT NULL DEFAULT 0,
    `pieces_rejected` INT UNSIGNED NOT NULL DEFAULT 0,
    `pieces_rework` INT UNSIGNED NOT NULL DEFAULT 0,
    `rate_per_piece` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `total_earnings` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `work_date` DATE NOT NULL,
    `shift` VARCHAR(50) NOT NULL DEFAULT 'Morning',
    `payroll_month` VARCHAR(10) NOT NULL, -- e.g. 2026-09
    `verified_by` VARCHAR(150) NULL,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`production_job_id`) REFERENCES `production_jobs` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`bundle_id`) REFERENCES `production_bundles` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
    INDEX `idx_op_logs_date` (`work_date`),
    INDEX `idx_op_logs_emp` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 15. FINISHING OPERATIONS & INSPECTIONS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `finishing_operations`;
CREATE TABLE `finishing_operations` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `operation_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. FIN-2026-001-01
    `production_job_id` BIGINT UNSIGNED NOT NULL,
    `operation_type` VARCHAR(100) NOT NULL, -- thread_trimming, washing, drying, ironing, steam_press, folding, final_finishing
    `received_quantity` INT UNSIGNED NOT NULL DEFAULT 0,
    `processed_quantity` INT UNSIGNED NOT NULL DEFAULT 0,
    `passed_quantity` INT UNSIGNED NOT NULL DEFAULT 0,
    `rejected_quantity` INT UNSIGNED NOT NULL DEFAULT 0,
    `rework_quantity` INT UNSIGNED NOT NULL DEFAULT 0,
    `status` VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- in_progress, completed, on_hold
    `operator_id` BIGINT UNSIGNED NULL,
    `operator_name` VARCHAR(150) NULL,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`production_job_id`) REFERENCES `production_jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 16. QA INSPECTIONS (ANSI/ASQ Z1.4 & AQL 2.5)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `qa_inspections`;
CREATE TABLE `qa_inspections` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `inspection_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. QA-2026-001-01
    `production_job_id` BIGINT UNSIGNED NOT NULL,
    `bundle_id` BIGINT UNSIGNED NULL,
    `inspection_stage` VARCHAR(100) NOT NULL DEFAULT 'end_of_line', -- inline_sewing, end_of_line, post_finishing, pre_shipment_audit
    `inspection_level` VARCHAR(50) NOT NULL DEFAULT 'Level II (Standard Normal)',
    `aql_level` VARCHAR(50) NOT NULL DEFAULT 'AQL 2.5 Major / 4.0 Minor',
    `lot_size` INT UNSIGNED NOT NULL DEFAULT 500,
    `sample_size` INT UNSIGNED NOT NULL DEFAULT 50,
    `passed_pieces` INT UNSIGNED NOT NULL DEFAULT 0,
    `failed_pieces` INT UNSIGNED NOT NULL DEFAULT 0,
    `rework_pieces` INT UNSIGNED NOT NULL DEFAULT 0,
    `critical_defects_found` INT UNSIGNED NOT NULL DEFAULT 0,
    `major_defects_found` INT UNSIGNED NOT NULL DEFAULT 0,
    `minor_defects_found` INT UNSIGNED NOT NULL DEFAULT 0,
    `inspection_result` VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, passed, failed, rework_required
    `status` VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- draft, in_progress, passed, failed, rework_required, approved
    `inspector_name` VARCHAR(150) NOT NULL DEFAULT 'QA Lead Inspector',
    `notes` TEXT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
-- 17. MASTER PACKING CARTONS & BARCODES
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `packing_cartons`;
CREATE TABLE `packing_cartons` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `carton_number` VARCHAR(50) NOT NULL UNIQUE, -- e.g. CTN-2026-001-001
    `production_job_id` BIGINT UNSIGNED NOT NULL,
    `carton_index` INT UNSIGNED NOT NULL DEFAULT 1,
    `carton_barcode` VARCHAR(50) NOT NULL UNIQUE,
    `packing_type` VARCHAR(100) NOT NULL DEFAULT 'Master Solid Carton', -- Master Solid, Assorted Size, Ratio Carton
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
-- 18. EXPORT DISPATCH & SHIPPING MANIFESTS
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
-- 19. 9-GATE MILESTONE TRACKING
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
-- 20. PAYROLL & SALARY DISBURSEMENTS
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
-- 21. SECURE FILE DOCUMENTS (Laravel Local Filesystem Metadata)
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
-- 22. LARAVEL QUEUE JOBS & FAILED JOBS (Database Queue Connection)
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

SET FOREIGN_KEY_CHECKS = 1;
