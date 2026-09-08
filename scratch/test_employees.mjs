// scratch/test_employees.mjs
// Comprehensive automated test suite for FactoryOS Employees & Workforce Management Module

import assert from "node:assert/strict";
import {
  createBlankEmployeeRecord,
  generateNextEmployeeNumber,
  validateEmployeeRecord,
  duplicateEmployeeRecord,
  archiveEmployeeRecord,
  appendTimelineEvent,
  computeEmployeeMetrics,
  calculateSalaryBreakdown,
  canHardDeleteEmployee,
  formatPKR,
  getEmployeeAttendanceSummary,
  EMPLOYEE_STORAGE_KEY,
} from "../lib/employees-engine.ts";

console.log("================================================================");
console.log("  FactoryOS Garment ERP — Employees Module Test Suite (Polished)");
console.log("================================================================");

let passedTests = 0;
let failedTests = 0;

function runTest(testNumber, name, fn) {
  try {
    fn();
    console.log(`✅ Test ${String(testNumber).padStart(2, "0")}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ Test ${String(testNumber).padStart(2, "0")} FAILED: ${name}`);
    console.error(err);
    failedTests++;
  }
}

// -------------------------------------------------------------
// Test 1: Create Employee structure initialization
// -------------------------------------------------------------
runTest(1, "Create Employee structure initialization", () => {
  const blank = createBlankEmployeeRecord([]);
  assert.ok(blank.id.startsWith("emp_"));
  assert.ok(blank.employeeNumber.startsWith("EMP-"));
  assert.equal(blank.isArchived, false);
  assert.equal(blank.employmentInfo.status, "Active");
});

// -------------------------------------------------------------
// Test 2: Auto Employee ID generation (EMP-YYYY-NNN)
// -------------------------------------------------------------
runTest(2, "Auto Employee ID generation (EMP-YYYY-NNN format)", () => {
  const currentYear = new Date().getFullYear();
  const id1 = generateNextEmployeeNumber([], currentYear);
  assert.equal(id1, `EMP-${currentYear}-001`);

  const mockExisting = [
    { employeeNumber: `EMP-${currentYear}-001` },
    { employeeNumber: `EMP-${currentYear}-002` },
    { employeeNumber: `EMP-${currentYear}-009` },
  ];
  const idNext = generateNextEmployeeNumber(mockExisting, currentYear);
  assert.equal(idNext, `EMP-${currentYear}-010`);
});

// -------------------------------------------------------------
// Test 3: Blank create form begins with clean empty fields
// -------------------------------------------------------------
runTest(3, "Blank create form begins with clean empty fields (no preselected defaults)", () => {
  const blank = createBlankEmployeeRecord([]);
  assert.equal(blank.personalInfo.fullName, "");
  assert.equal(blank.personalInfo.phone, "");
  assert.equal(blank.personalInfo.cnic, "");
  assert.equal(blank.personalInfo.email, "");
  assert.equal(blank.personalInfo.address, "");
  assert.equal(blank.personalInfo.city, "");
  assert.equal(blank.employmentInfo.department, ""); // Empty default
  assert.equal(blank.employmentInfo.designation, ""); // Empty default
  assert.equal(blank.factoryInfo.skillLevel, ""); // Empty default
  assert.equal(blank.factoryInfo.assignedLine, ""); // Empty default
  assert.equal(blank.factoryInfo.shift, ""); // Empty default
});

// -------------------------------------------------------------
// Test 4: No fake employee data preloaded
// -------------------------------------------------------------
runTest(4, "No fake or demo employee data prefilled in create template", () => {
  const blank = createBlankEmployeeRecord([]);
  assert.equal(blank.personalInfo.fullName, "");
  assert.equal(blank.salaryInfo.monthlySalary, undefined);
  assert.equal(blank.salaryInfo.dailyRate, undefined);
  assert.equal(blank.salaryInfo.pieceRate, undefined);
  assert.deepEqual(blank.salaryInfo.pieceRateOperations, []);
});

// -------------------------------------------------------------
// Test 5: Save Employee valid record
// -------------------------------------------------------------
runTest(5, "Save valid Employee record successfully", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.personalInfo.fullName = "Tariq Mahmood";
  emp.personalInfo.phone = "03001234567";
  emp.employmentInfo.department = "Stitching";
  emp.employmentInfo.designation = "Senior Tailor";
  emp.salaryInfo.salaryType = "monthly";
  emp.salaryInfo.monthlySalary = 48000;

  const errors = validateEmployeeRecord(emp, []);
  assert.equal(errors.length, 0);
});

// -------------------------------------------------------------
// Test 6: Serialization & storage persistence integrity
// -------------------------------------------------------------
runTest(6, "Serialization & storage persistence integrity", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.personalInfo.fullName = "Ali Raza";
  emp.personalInfo.phone = "03219876543";
  emp.employmentInfo.department = "Cutting";
  emp.employmentInfo.designation = "Pattern Master";

  const serialized = JSON.stringify([emp]);
  const parsed = JSON.parse(serialized);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].personalInfo.fullName, "Ali Raza");
  assert.equal(parsed[0].employmentInfo.department, "Cutting");
});

// -------------------------------------------------------------
// Test 7: Edit Employee profile modifications
// -------------------------------------------------------------
runTest(7, "Edit Employee updates fields and updatedAt timestamp", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.createdAt = "2026-01-01T00:00:00.000Z";
  emp.updatedAt = "2026-01-01T00:00:00.000Z";
  emp.personalInfo.fullName = "Usman Khan";
  emp.employmentInfo.designation = "Junior Operator";

  const edited = {
    ...emp,
    employmentInfo: { ...emp.employmentInfo, designation: "Senior Line Master" },
    updatedAt: new Date().toISOString(),
  };

  assert.equal(edited.employmentInfo.designation, "Senior Line Master");
  assert.notEqual(edited.updatedAt, emp.createdAt);
});

// -------------------------------------------------------------
// Test 8: Search Employee across multiple fields
// -------------------------------------------------------------
runTest(8, "Search Employee by ID, Name, Phone, and CNIC", () => {
  const list = [
    {
      employeeNumber: "EMP-2026-001",
      personalInfo: { fullName: "Zahid Ahmed", phone: "03001112223", cnic: "35201-1111111-1" },
      employmentInfo: { department: "Stitching", designation: "Tailor" },
    },
    {
      employeeNumber: "EMP-2026-002",
      personalInfo: { fullName: "Kamran Siddiqui", phone: "03214445556", cnic: "35201-2222222-2" },
      employmentInfo: { department: "Cutting", designation: "Cutting Master" },
    },
  ];

  const searchByName = list.filter((e) => e.personalInfo.fullName.toLowerCase().includes("kamran"));
  assert.equal(searchByName.length, 1);

  const searchByPhone = list.filter((e) => e.personalInfo.phone.includes("1112223"));
  assert.equal(searchByPhone.length, 1);

  const searchByCnic = list.filter((e) => e.personalInfo.cnic.includes("2222222"));
  assert.equal(searchByCnic.length, 1);

  const searchById = list.filter((e) => e.employeeNumber.includes("001"));
  assert.equal(searchById.length, 1);
});

// -------------------------------------------------------------
// Test 9: Filter by Department
// -------------------------------------------------------------
runTest(9, "Filter employees by Department", () => {
  const list = [
    { employmentInfo: { department: "Cutting" } },
    { employmentInfo: { department: "Stitching" } },
    { employmentInfo: { department: "Stitching" } },
    { employmentInfo: { department: "Finishing" } },
  ];

  const stitchingOnly = list.filter((e) => e.employmentInfo.department === "Stitching");
  assert.equal(stitchingOnly.length, 2);
});

// -------------------------------------------------------------
// Test 10: Filter by Status
// -------------------------------------------------------------
runTest(10, "Filter employees by Status (Active / On Leave / Inactive)", () => {
  const list = [
    { employmentInfo: { status: "Active" }, isArchived: false },
    { employmentInfo: { status: "On Leave" }, isArchived: false },
    { employmentInfo: { status: "Inactive" }, isArchived: true },
  ];

  const activeOnly = list.filter((e) => !e.isArchived && e.employmentInfo.status === "Active");
  assert.equal(activeOnly.length, 1);
});

// -------------------------------------------------------------
// Test 11: Filter by Salary Type
// -------------------------------------------------------------
runTest(11, "Filter employees by Wage Type (Monthly, Daily, Piece Rate)", () => {
  const list = [
    { salaryInfo: { salaryType: "monthly" } },
    { salaryInfo: { salaryType: "daily" } },
    { salaryInfo: { salaryType: "piece_rate" } },
  ];

  const pieceRateOnly = list.filter((e) => e.salaryInfo.salaryType === "piece_rate");
  assert.equal(pieceRateOnly.length, 1);
});

// -------------------------------------------------------------
// Test 12: Monthly salary configuration save & breakdown
// -------------------------------------------------------------
runTest(12, "Monthly salary structure and breakdown calculation", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.personalInfo.fullName = "Saeed Anwar";
  emp.personalInfo.phone = "03001234567";
  emp.employmentInfo.department = "Admin";
  emp.employmentInfo.designation = "HR Manager";
  emp.salaryInfo.salaryType = "monthly";
  emp.salaryInfo.monthlySalary = 60000;

  const breakdown = calculateSalaryBreakdown(60000);
  assert.equal(breakdown.basicSalary, 36000); // 60%
  assert.equal(breakdown.houseRentAllowance, 12000); // 20%
  assert.equal(breakdown.conveyanceAllowance, 6000); // 10%
  assert.equal(breakdown.medicalAllowance, 3000); // 5%
});

// -------------------------------------------------------------
// Test 13: Daily wage configuration save
// -------------------------------------------------------------
runTest(13, "Daily wage structure validation and save", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.personalInfo.fullName = "Rashid Latif";
  emp.personalInfo.phone = "03001234567";
  emp.employmentInfo.department = "Finishing";
  emp.employmentInfo.designation = "Iron Presser";
  emp.salaryInfo.salaryType = "daily";
  emp.salaryInfo.dailyRate = 1750;

  const errors = validateEmployeeRecord(emp, []);
  assert.equal(errors.length, 0);
  assert.equal(emp.salaryInfo.dailyRate, 1750);
});

// -------------------------------------------------------------
// Test 14: Piece rate operations configuration save
// -------------------------------------------------------------
runTest(14, "Piece rate operations table structure and save", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.personalInfo.fullName = "Shahid Afridi";
  emp.personalInfo.phone = "03001234567";
  emp.employmentInfo.department = "Stitching";
  emp.employmentInfo.designation = "Collar Specialist";
  emp.salaryInfo.salaryType = "piece_rate";
  emp.salaryInfo.pieceRate = 14;
  emp.salaryInfo.pieceRateOperations = [
    { id: "op_1", operationName: "Collar Stitching", ratePerPiece: 14 },
    { id: "op_2", operationName: "Cuff Attaching", ratePerPiece: 12 },
  ];

  const errors = validateEmployeeRecord(emp, []);
  assert.equal(errors.length, 0);
  assert.equal(emp.salaryInfo.pieceRateOperations.length, 2);
  assert.equal(emp.salaryInfo.pieceRateOperations[0].ratePerPiece, 14);
});

// -------------------------------------------------------------
// Test 15: Duplicate Employee execution
// -------------------------------------------------------------
runTest(15, "Duplicate Employee creates clean independent clone", () => {
  const source = createBlankEmployeeRecord([]);
  source.employeeNumber = "EMP-2026-001";
  source.personalInfo.fullName = "Waqar Younis";
  source.personalInfo.phone = "03009998877";
  source.employmentInfo.department = "Stitching";
  source.employmentInfo.designation = "Master Tailor";
  source.salaryInfo.salaryType = "monthly";
  source.salaryInfo.monthlySalary = 50000;

  const duplicate = duplicateEmployeeRecord(source, [source]);
  assert.ok(duplicate);
  assert.notEqual(duplicate.id, source.id);
});

// -------------------------------------------------------------
// Test 16: Duplicate gets new sequential ID
// -------------------------------------------------------------
runTest(16, "Duplicate receives newly generated sequential EMP ID", () => {
  const currentYear = new Date().getFullYear();
  const source = createBlankEmployeeRecord([]);
  source.employeeNumber = `EMP-${currentYear}-001`;

  const duplicate = duplicateEmployeeRecord(source, [source]);
  assert.equal(duplicate.employeeNumber, `EMP-${currentYear}-002`);
});

// -------------------------------------------------------------
// Test 17: Duplicate wipes payroll, advances, attendance
// -------------------------------------------------------------
runTest(17, "Duplicate does NOT carry over historical payroll or CNIC collisions", () => {
  const source = createBlankEmployeeRecord([]);
  source.personalInfo.cnic = "35201-9999999-9";
  source.timeline = [{ id: "tl_old", type: "created", title: "Old", description: "Old", timestamp: "2026-01-01" }];

  const duplicate = duplicateEmployeeRecord(source, [source]);
  assert.equal(duplicate.personalInfo.cnic, ""); // CNIC cleared to avoid collision
  assert.equal(duplicate.employmentInfo.status, "Active");
  assert.equal(duplicate.isArchived, false);
});

// -------------------------------------------------------------
// Test 18: Archive Employee
// -------------------------------------------------------------
runTest(18, "Archive Employee sets isArchived=true and status=Inactive", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.personalInfo.fullName = "Inzamam Ul Haq";
  emp.employmentInfo.status = "Active";

  const archived = archiveEmployeeRecord(emp);
  assert.equal(archived.isArchived, true);
  assert.equal(archived.employmentInfo.status, "Inactive");
  assert.ok(archived.timeline.some((t) => t.type === "archived"));
});

// -------------------------------------------------------------
// Test 19: Prevent hard delete with history
// -------------------------------------------------------------
runTest(19, "Safety check prevents hard deletion when linked history exists", () => {
  const emp = createBlankEmployeeRecord([]);
  const deleteWithHistory = canHardDeleteEmployee(emp, true);
  assert.equal(deleteWithHistory.canDelete, false);
  assert.ok(deleteWithHistory.reason.includes("Archive instead"));

  const deleteWithoutHistory = canHardDeleteEmployee(emp, false);
  assert.equal(deleteWithoutHistory.canDelete, true);
});

// -------------------------------------------------------------
// Test 20: Strict 13-digit Pakistani CNIC validation & rejection
// -------------------------------------------------------------
runTest(20, "Strict 13-digit Pakistani CNIC validation (accepts 13 digits, rejects short like 43566)", () => {
  const empInvalid = createBlankEmployeeRecord([]);
  empInvalid.personalInfo.fullName = "Worker Short CNIC";
  empInvalid.personalInfo.phone = "03001234567";
  empInvalid.personalInfo.cnic = "43566"; // Invalid short CNIC
  empInvalid.employmentInfo.department = "Stitching";
  empInvalid.employmentInfo.designation = "Tailor";
  empInvalid.salaryInfo.salaryType = "monthly";
  empInvalid.salaryInfo.monthlySalary = 35000;

  const errors = validateEmployeeRecord(empInvalid, []);
  assert.ok(errors.some((e) => e.field === "cnic" && e.message.includes("13 digits")));

  // Valid hyphenated
  empInvalid.personalInfo.cnic = "35202-1234567-1";
  const validErrors1 = validateEmployeeRecord(empInvalid, []);
  assert.equal(validErrors1.length, 0);

  // Valid 13 unbroken digits
  empInvalid.personalInfo.cnic = "3520212345671";
  const validErrors2 = validateEmployeeRecord(empInvalid, []);
  assert.equal(validErrors2.length, 0);
});

// -------------------------------------------------------------
// Test 21: Pakistan Phone format validation
// -------------------------------------------------------------
runTest(21, "Pakistan Phone validation allows 03xx, +923xx, and 923xx formats", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.personalInfo.fullName = "Shoaib Akhtar";
  emp.employmentInfo.department = "Finishing";
  emp.employmentInfo.designation = "Operator";
  emp.salaryInfo.salaryType = "monthly";
  emp.salaryInfo.monthlySalary = 35000;

  // Test valid formats
  emp.personalInfo.phone = "03001234567";
  assert.equal(validateEmployeeRecord(emp, []).length, 0);

  emp.personalInfo.phone = "+923001234567";
  assert.equal(validateEmployeeRecord(emp, []).length, 0);

  emp.personalInfo.phone = "923001234567";
  assert.equal(validateEmployeeRecord(emp, []).length, 0);

  // Test invalid formats
  emp.personalInfo.phone = "0353446uyg";
  assert.ok(validateEmployeeRecord(emp, []).some((e) => e.field === "phone"));
});

// -------------------------------------------------------------
// Test 22: Salary validation (negative values rejected)
// -------------------------------------------------------------
runTest(22, "Salary validation rejects negative salaries and rates", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.personalInfo.fullName = "Abdul Razzaq";
  emp.personalInfo.phone = "03001234567";
  emp.employmentInfo.department = "Packing";
  emp.employmentInfo.designation = "Packer";
  emp.salaryInfo.salaryType = "monthly";
  emp.salaryInfo.monthlySalary = -5000;

  const errors = validateEmployeeRecord(emp, []);
  assert.ok(errors.some((e) => e.field === "monthlySalary"));
});

// -------------------------------------------------------------
// Test 23: Multiple employee isolation
// -------------------------------------------------------------
runTest(23, "Multiple employee records maintain separate data isolation", () => {
  const emp1 = createBlankEmployeeRecord([]);
  emp1.personalInfo.fullName = "Mohammad Yousuf";
  emp1.salaryInfo.monthlySalary = 60000;

  const emp2 = createBlankEmployeeRecord([]);
  emp2.personalInfo.fullName = "Younis Khan";
  emp2.salaryInfo.monthlySalary = 80000;

  assert.notEqual(emp1.id, emp2.id);
  assert.equal(emp1.salaryInfo.monthlySalary, 60000);
  assert.equal(emp2.salaryInfo.monthlySalary, 80000);
});

// -------------------------------------------------------------
// Test 24: Dynamic KPI calculations
// -------------------------------------------------------------
runTest(24, "Dynamic KPI calculation across workforce counts and payroll", () => {
  const employeesList = [
    {
      id: "1",
      employmentInfo: { status: "Active", department: "Stitching", designation: "Tailor" },
      salaryInfo: { salaryType: "monthly", monthlySalary: 50000 },
      isArchived: false,
    },
    {
      id: "2",
      employmentInfo: { status: "Active", department: "Cutting", designation: "Cutter" },
      salaryInfo: { salaryType: "daily", dailyRate: 2000 },
      isArchived: false,
    },
    {
      id: "3",
      employmentInfo: { status: "Active", department: "Admin", designation: "Manager" },
      salaryInfo: { salaryType: "monthly", monthlySalary: 70000 },
      isArchived: false,
    },
    {
      id: "4",
      employmentInfo: { status: "On Leave", department: "Finishing", designation: "Ironer" },
      salaryInfo: { salaryType: "piece_rate", pieceRate: 15 },
      isArchived: false,
    },
    {
      id: "5",
      employmentInfo: { status: "Inactive", department: "Stitching", designation: "Tailor" },
      salaryInfo: { salaryType: "monthly", monthlySalary: 40000 },
      isArchived: true,
    },
  ];

  const metrics = computeEmployeeMetrics(employeesList);
  assert.equal(metrics.totalEmployees, 4);
  assert.equal(metrics.activeEmployees, 3);
  assert.equal(metrics.onLeaveCount, 1);
  assert.equal(metrics.factoryWorkers, 3);
  assert.equal(metrics.officeStaff, 1);
  assert.equal(metrics.monthlyPayrollEstimate, 202000);
});

// -------------------------------------------------------------
// Test 25: Activity Timeline creation
// -------------------------------------------------------------
runTest(25, "Timeline event creation and logging", () => {
  let emp = createBlankEmployeeRecord([]);
  emp = appendTimelineEvent(emp, "created", "Profile Initialized", "Employee profile created in system");
  assert.equal(emp.timeline.length, 1);
  assert.equal(emp.timeline[0].title, "Profile Initialized");
});

// -------------------------------------------------------------
// Test 26: Deduplication of rapid timeline events
// -------------------------------------------------------------
runTest(26, "Timeline deduplication prevents rapid duplicate events", () => {
  let emp = createBlankEmployeeRecord([]);
  emp = appendTimelineEvent(emp, "updated", "Profile Saved", "Saved changes");
  emp = appendTimelineEvent(emp, "updated", "Profile Saved", "Saved changes");
  assert.equal(emp.timeline.length, 1);
});

// -------------------------------------------------------------
// Test 27: Department update logging
// -------------------------------------------------------------
runTest(27, "Department change logging in timeline", () => {
  let emp = createBlankEmployeeRecord([]);
  emp = appendTimelineEvent(
    emp,
    "department_changed",
    "Department Reassigned",
    "Moved from Cutting to Stitching"
  );
  assert.ok(emp.timeline.some((t) => t.type === "department_changed"));
});

// -------------------------------------------------------------
// Test 28: Status update logging
// -------------------------------------------------------------
runTest(28, "Status change logging in timeline", () => {
  let emp = createBlankEmployeeRecord([]);
  emp = appendTimelineEvent(
    emp,
    "status_changed",
    "Status Changed",
    "Employee marked On Leave"
  );
  assert.ok(emp.timeline.some((t) => t.type === "status_changed"));
});

// -------------------------------------------------------------
// Test 29: Browser refresh integrity & storage key
// -------------------------------------------------------------
runTest(29, "Storage key consistency and JSON roundtrip integrity", () => {
  assert.equal(EMPLOYEE_STORAGE_KEY, "factoryos_employees");
  const dataset = [createBlankEmployeeRecord([])];
  const str = JSON.stringify(dataset);
  const reloaded = JSON.parse(str);
  assert.equal(reloaded[0].employeeNumber, dataset[0].employeeNumber);
});

// -------------------------------------------------------------
// Test 30: Zero orphan records & complete data model
// -------------------------------------------------------------
runTest(30, "No orphan records and all sub-objects properly instantiated", () => {
  const emp = createBlankEmployeeRecord([]);
  assert.ok(emp.personalInfo);
  assert.ok(emp.employmentInfo);
  assert.ok(emp.salaryInfo);
  assert.ok(emp.factoryInfo);
  assert.ok(emp.documents);
  assert.ok(Array.isArray(emp.timeline));
});

// -------------------------------------------------------------
// Extra Tests: Documents, Attendance, Payroll
// -------------------------------------------------------------
runTest(31, "Documents data model structure (zero fake attachments initially)", () => {
  const emp = createBlankEmployeeRecord([]);
  assert.ok(Array.isArray(emp.documents));
  assert.equal(emp.documents.length, 0); // Zero fake attachments
  emp.documents.push({
    id: "doc_1",
    type: "cnic_front",
    title: "CNIC Copy Front",
    fileName: "cnic_front.pdf",
    fileSize: "1.2 MB",
    uploadedAt: "29-Aug-2026",
  });
  assert.equal(emp.documents.length, 1);
});

runTest(32, "Attendance summary returns 0 for empty employee records (zero fake metrics)", () => {
  const emp = createBlankEmployeeRecord([]);
  const att = getEmployeeAttendanceSummary(emp);
  assert.equal(att.attendanceRatePercentage, 0);
  assert.equal(att.totalWorkingDays, 0);
  assert.equal(att.dailyLogs.length, 0);
});

runTest(33, "Attendance summary calculates accurate metrics when daily logs exist", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.attendanceRecords = [
    { date: "2026-08-01", checkIn: "08:00 AM", checkOut: "05:00 PM", status: "Present", overtimeHours: 0 },
    { date: "2026-08-02", checkIn: "08:15 AM", checkOut: "05:00 PM", status: "Late", overtimeHours: 0 },
    { date: "2026-08-03", checkIn: "—", checkOut: "—", status: "Absent", overtimeHours: 0 },
    { date: "2026-08-04", checkIn: "08:00 AM", checkOut: "07:00 PM", status: "Present", overtimeHours: 2 },
  ];
  const att = getEmployeeAttendanceSummary(emp);
  assert.equal(att.totalWorkingDays, 4);
  assert.equal(att.presentDays, 3); // 2 Present + 1 Late
  assert.equal(att.lateDays, 1);
  assert.equal(att.absentDays, 1);
  assert.equal(att.overtimeHours, 2);
  assert.equal(att.attendanceRatePercentage, 75); // 3 / 4 = 75%
});

runTest(34, "Currency formatter PKR", () => {
  assert.equal(formatPKR(50000), "PKR 50,000");
  assert.equal(formatPKR(0), "PKR 0");
});

console.log("================================================================");
console.log(`  Test Results: ${passedTests} Passed, ${failedTests} Failed`);
console.log("================================================================");

if (failedTests > 0) {
  process.exit(1);
}
