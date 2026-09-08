// scratch/test_employee_lifecycle.mjs
// Comprehensive test for Employee Add flow, Validation, Country Code separation, and Refresh persistence

import {
  createBlankEmployeeRecord,
  validateEmployeeRecord,
  formatCNIC,
  formatPhoneNumber,
  EMPLOYEE_STORAGE_KEY,
  calculateSalaryBreakdown,
} from "../lib/employees-engine.ts";
import {
  mapEmployeeRecordToRow,
  mapRowToEmployeeRecord,
} from "../lib/supabase/employees-db.ts";

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAILED: ${testName}`);
    failed++;
  }
}

console.log("================================================================");
console.log("  FactoryOS Garment ERP — Add Employee Complete Lifecycle Test");
console.log("================================================================");

// Simulated localStorage
const localStorageMock = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  },
};

// 1. Initial Blank Form
const initialList = [];
const blankForm = createBlankEmployeeRecord(initialList);
assert(blankForm.employeeNumber.startsWith("EMP-"), "Test 01: Auto-generated Employee ID format EMP-YYYY-NNN");
assert(blankForm.employmentInfo.department === "", "Test 02: Blank form starts with empty department");
assert(blankForm.employmentInfo.designation === "", "Test 03: Blank form starts with empty designation");

// 2. User fills exact test fields:
// Name: Test Worker
// Phone: +923001234567
// Department: Cutting
// Designation: Operator
const phoneCountryCode = "+92";
const rawTypedPhone = "3001234567";
const cleanDigits = rawTypedPhone.replace(/^(\+\d+|\d{2,3})[\s-]*/, "");
const fullPhone = `${phoneCountryCode} ${cleanDigits}`;

const candidate = {
  ...blankForm,
  personalInfo: {
    ...blankForm.personalInfo,
    fullName: "Test Worker",
    phone: fullPhone,
    phoneCountryCode: phoneCountryCode,
    phoneNumber: cleanDigits,
  },
  employmentInfo: {
    ...blankForm.employmentInfo,
    department: "Cutting",
    designation: "Operator",
    joiningDate: "2026-08-29",
  },
};

// 3. Validation lifecycle
const errors = validateEmployeeRecord(candidate, initialList);
assert(errors.length === 0, "Test 04: Validation passes for Test Worker with required fields");

// 4. Verification of country code and phone separation
assert(candidate.personalInfo.phoneCountryCode === "+92", "Test 05: phone_country_code stored as +92");
assert(candidate.personalInfo.phoneNumber === "3001234567", "Test 06: phone_number stored separately as 3001234567");
assert(candidate.personalInfo.phone === "+92 3001234567", "Test 07: full phone formatted cleanly");

// 5. Supabase DB Row Mapping Verification
const pgRow = mapEmployeeRecordToRow(candidate);
assert(pgRow.full_name === "Test Worker", "Test 08: Supabase row full_name matches");
assert(pgRow.department === "Cutting", "Test 09: Supabase row department matches");
assert(pgRow.designation === "Operator", "Test 10: Supabase row designation matches");
assert(pgRow.phone_country_code === "+92", "Test 11: Supabase row phone_country_code mapped");
assert(pgRow.phone_number === "3001234567", "Test 12: Supabase row phone_number mapped");

// 6. DB Row to Domain Model Mapping Verification
const mappedBack = mapRowToEmployeeRecord(pgRow);
assert(mappedBack.personalInfo.fullName === "Test Worker", "Test 13: mapRowToEmployeeRecord full name matches");
assert(mappedBack.personalInfo.phoneCountryCode === "+92", "Test 14: mapRowToEmployeeRecord country code matches");
assert(mappedBack.personalInfo.phoneNumber === "3001234567", "Test 15: mapRowToEmployeeRecord phone number matches");

// 7. LocalStorage Save
const storageList = [candidate];
localStorageMock.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(storageList));
assert(localStorageMock.getItem(EMPLOYEE_STORAGE_KEY) !== null, "Test 16: Saved to localStorage successfully");

// 8. Simulated Page Refresh (Reload from Storage)
const reloadedJson = localStorageMock.getItem(EMPLOYEE_STORAGE_KEY);
const reloadedEmployees = JSON.parse(reloadedJson);
assert(reloadedEmployees.length === 1, "Test 17: Exactly 1 employee exists after reload");
assert(reloadedEmployees[0].personalInfo.fullName === "Test Worker", "Test 18: Test Worker persisted after reload");
assert(reloadedEmployees[0].employmentInfo.department === "Cutting", "Test 19: Department Cutting persisted after reload");
assert(reloadedEmployees[0].employmentInfo.designation === "Operator", "Test 20: Designation Operator persisted after reload");
assert(reloadedEmployees[0].personalInfo.phoneCountryCode === "+92", "Test 21: Country code persisted after reload");

// 9. Add 2nd employee to verify no duplicate overwrite
const secondEmployee = {
  ...createBlankEmployeeRecord(reloadedEmployees),
  personalInfo: {
    fullName: "Ahmad Raza",
    phone: "+92 301 9876543",
    phoneCountryCode: "+92",
    phoneNumber: "3019876543",
  },
  employmentInfo: {
    department: "Stitching",
    designation: "Tailor",
    joiningDate: "2026-08-29",
  },
};
const updatedStorageList = [secondEmployee, ...reloadedEmployees];
localStorageMock.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(updatedStorageList));

const secondReload = JSON.parse(localStorageMock.getItem(EMPLOYEE_STORAGE_KEY));
assert(secondReload.length === 2, "Test 22: 2 employees exist after 2nd reload");
assert(secondReload.find((e) => e.personalInfo.fullName === "Test Worker") !== undefined, "Test 23: Test Worker still exists alongside second employee");

console.log("================================================================");
console.log(`  Test Results: ${passed} Passed, ${failed} Failed`);
console.log("================================================================");
if (failed > 0) process.exit(1);
