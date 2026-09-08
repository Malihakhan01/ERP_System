// scratch/test_employees_supabase.mjs
// Automated test suite for Supabase Database mapping and integration

import assert from "node:assert/strict";
import {
  mapEmployeeRecordToRow,
  mapRowToEmployeeRecord,
  isSupabaseConfigured,
} from "../lib/supabase/employees-db.ts";
import { createBlankEmployeeRecord } from "../lib/employees-engine.ts";

console.log("================================================================");
console.log("  FactoryOS — Supabase Backend Integration Test Suite");
console.log("================================================================");

let passed = 0;
let failed = 0;

function runTest(num, title, fn) {
  try {
    fn();
    console.log(`✅ Test ${String(num).padStart(2, "0")}: ${title}`);
    passed++;
  } catch (err) {
    console.error(`❌ Test ${String(num).padStart(2, "0")} FAILED: ${title}`);
    console.error(err);
    failed++;
  }
}

// 1. Dual-mode config check
runTest(1, "Supabase connection detection (dual-mode check)", () => {
  const configured = isSupabaseConfigured();
  assert.equal(typeof configured, "boolean");
});

// 2. Map Employee Record to PostgreSQL row
runTest(2, "Map EmployeeRecord to PostgreSQL database row", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.employeeNumber = "EMP-2026-001";
  emp.personalInfo.fullName = "Maliha Khan";
  emp.personalInfo.cnic = "35202-1234567-1";
  emp.personalInfo.phone = "03001234567";
  emp.employmentInfo.department = "Cutting";
  emp.employmentInfo.designation = "Senior Cutting Master";
  emp.salaryInfo.salaryType = "monthly";
  emp.salaryInfo.monthlySalary = 45000;

  const row = mapEmployeeRecordToRow(emp);
  assert.equal(row.employee_number, "EMP-2026-001");
  assert.equal(row.full_name, "Maliha Khan");
  assert.equal(row.cnic, "35202-1234567-1");
  assert.equal(row.department, "Cutting");
  assert.equal(row.monthly_salary, 45000);
});

// 3. Map PostgreSQL row back to EmployeeRecord
runTest(3, "Map PostgreSQL row and relations back to EmployeeRecord", () => {
  const mockRow = {
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    employee_number: "EMP-2026-005",
    full_name: "Tariq Mahmood",
    father_name: "Mahmood Akhtar",
    cnic: "35201-9876543-1",
    phone: "03214445556",
    email: "tariq@factoryos.com",
    address: "Model Town, Lahore",
    city: "Lahore",
    emergency_contact: "0300-1112233",
    joining_date: "2026-08-01",
    department: "Stitching",
    designation: "Collar Specialist",
    employment_type: "Permanent",
    status: "Active",
    salary_type: "piece_rate",
    monthly_salary: null,
    daily_rate: null,
    piece_rate: 15,
    bank_name: "Meezan Bank",
    account_number: "PK60MEZN00123456789",
    payment_mode: "Bank Transfer",
    skill_level: "Master Craftsman",
    assigned_line: "Line 2 (Polo & Collar)",
    operation: "Collar Joining",
    shift: "Morning",
    experience_years: 6,
    is_archived: false,
    created_at: "2026-08-01T08:00:00.000Z",
    updated_at: "2026-08-29T10:00:00.000Z",
  };

  const mockOps = [
    { id: "op_1", operation_name: "Collar Stitching", rate_per_piece: 14, standard_smv: 1.2, target_pcs_per_hour: 40 },
  ];

  const mockDocs = [
    { id: "doc_1", document_type: "cnic_front", title: "CNIC Front", file_name: "cnic_front.pdf", file_size: "1.2 MB", uploaded_at: "2026-08-01" },
  ];

  const mockTimeline = [
    { id: "tl_1", event_type: "created", title: "Created", description: "Created", timestamp: "2026-08-01T08:00:00.000Z", actor: "Admin" },
  ];

  const emp = mapRowToEmployeeRecord(mockRow, mockOps, mockDocs, mockTimeline);
  assert.equal(emp.id, "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
  assert.equal(emp.employeeNumber, "EMP-2026-005");
  assert.equal(emp.personalInfo.fullName, "Tariq Mahmood");
  assert.equal(emp.salaryInfo.pieceRate, 15);
  assert.equal(emp.salaryInfo.pieceRateOperations.length, 1);
  assert.equal(emp.salaryInfo.pieceRateOperations[0].operationName, "Collar Stitching");
  assert.equal(emp.documents.length, 1);
  assert.equal(emp.timeline.length, 1);
});

console.log("================================================================");
console.log(`  Supabase Test Results: ${passed} Passed, ${failed} Failed`);
console.log("================================================================");

if (failed > 0) process.exit(1);
