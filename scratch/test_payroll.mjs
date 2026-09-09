// scratch/test_payroll.mjs
// Automated Test Suite for FactoryOS Garment ERP Payroll & Wage Engine

import {
  calculateEmployeePayrollRecord,
  processMonthlyPayrollRun,
  markPayrollRecordPaid,
  computePayrollDashboardMetrics,
  generateNextPayrollNumber,
  formatPKR,
  calculateOvertimeRate,
  calculatePakistanIncomeTax,
  PAYROLL_STORAGE_KEY,
} from "../lib/payroll-engine.ts";
import {
  mapRowToPayrollRun,
  mapRowToPayrollRecordItem,
} from "../lib/services/-service.ts";

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
console.log("  FactoryOS Garment ERP — Salaries & Payroll Module Test Suite");
console.log("================================================================");

// Simulated Storage
const localStorageMock = {
  store: {},
  getItem(k) {
    return this.store[k] || null;
  },
  setItem(k, v) {
    this.store[k] = String(v);
  },
  clear() {
    this.store = {};
  },
};

// -----------------------------------------------------------------------------
// Test 1: Employee with fixed monthly salary
// -----------------------------------------------------------------------------
const monthlyWorker = {
  id: "emp-001",
  employeeNumber: "EMP-2026-001",
  personalInfo: { fullName: "Maliha Khan" },
  employmentInfo: { department: "Cutting", designation: "Senior Cutter", status: "Active" },
  salaryInfo: { salaryType: "monthly", monthlySalary: 50000 },
};

const rec1 = calculateEmployeePayrollRecord({
  employee: monthlyWorker,
  payrollMonth: "2026-08",
  workingDays: 26,
  presentDays: 26,
});

assert(rec1.grossSalary === 50000, "Test 1A: Fixed monthly gross salary is PKR 50,000");
assert(rec1.netPayable === 50000, "Test 1B: Fixed monthly net salary with zero deductions is PKR 50,000");
assert(rec1.absentDeduction === 0, "Test 1C: Full attendance has 0 absent deduction");

// Absent test for fixed monthly
const rec1Absent = calculateEmployeePayrollRecord({
  employee: monthlyWorker,
  payrollMonth: "2026-08",
  workingDays: 26,
  presentDays: 24, // 2 days absent
});
const expectedDayRate = Math.round(50000 / 26);
assert(rec1Absent.absentDays === 2, "Test 1D: 2 absent days correctly recognized");
assert(rec1Absent.absentDeduction === expectedDayRate * 2, "Test 1E: Absent deduction applies daily rate");
assert(rec1Absent.netPayable === 50000 - expectedDayRate * 2, "Test 1F: Net salary reduced by absent deduction");

// -----------------------------------------------------------------------------
// Test 2: Employee with advance loan (automatic recovery)
// -----------------------------------------------------------------------------
const activeAdvances = [
  {
    id: "adv-001",
    advanceNumber: "ADV-2026-001",
    employeeId: "emp-001",
    employeeNumber: "EMP-2026-001",
    employeeName: "Maliha Khan",
    department: "Cutting",
    requestedAmount: 20000,
    approvedAmount: 20000,
    monthlyDeduction: 5000,
    remainingBalance: 15000,
    status: "Recovering",
    repaymentMonths: 4,
    repaymentHistory: [],
    requestDate: "2026-08-01",
    createdAt: "2026-08-01",
    updatedAt: "2026-08-01",
  },
];

const rec2 = calculateEmployeePayrollRecord({
  employee: monthlyWorker,
  payrollMonth: "2026-08",
  advancesList: activeAdvances,
  workingDays: 26,
  presentDays: 26,
});

assert(rec2.advanceDeduction === 5000, "Test 2A: Advance deduction of PKR 5,000 automatically recovered");
assert(rec2.remainingAdvanceBalance === 10000, "Test 2B: Remaining advance balance calculated as PKR 10,000");
assert(rec2.netPayable === 45000, "Test 2C: Net payable is PKR 45,000 (50,000 - 5,000)");

// -----------------------------------------------------------------------------
// Test 3: Employee with overtime hours
// -----------------------------------------------------------------------------
const rec3 = calculateEmployeePayrollRecord({
  employee: monthlyWorker,
  payrollMonth: "2026-08",
  workingDays: 26,
  presentDays: 26,
  overtimeHours: 20, // 20 hours OT
});

const hourlyRate = calculateOvertimeRate("monthly", 50000);
const expectedOT = 20 * hourlyRate;
assert(rec3.overtimeHours === 20, "Test 3A: 20 overtime hours recorded");
assert(rec3.overtimeAmount === expectedOT, `Test 3B: Overtime amount PKR ${expectedOT} calculated at rate ${hourlyRate}/hr`);
assert(rec3.grossSalary === 50000 + expectedOT, "Test 3C: Gross salary includes base + overtime");

// -----------------------------------------------------------------------------
// Test 4: Garment Piece Rate Worker (Production Operations)
// -----------------------------------------------------------------------------
const pieceWorker = {
  id: "emp-002",
  employeeNumber: "EMP-2026-002",
  personalInfo: { fullName: "Ali Stitcher" },
  employmentInfo: { department: "Stitching", designation: "Operator", status: "Active" },
  salaryInfo: { salaryType: "piece_rate", monthlySalary: 0, dailyRate: 0 },
};

const pieceOperations = [
  { operationName: "Pocket Stitching", pieces: 500, ratePerPiece: 10, totalAmount: 5000 },
  { operationName: "Collar Attaching", pieces: 400, ratePerPiece: 15, totalAmount: 6000 },
];

const rec4 = calculateEmployeePayrollRecord({
  employee: pieceWorker,
  payrollMonth: "2026-08",
  workingDays: 26,
  presentDays: 26,
  pieceRateEarnings: pieceOperations,
  allowances: 1000, // Attendance bonus
});

assert(rec4.pieceRateAmount === 11000, "Test 4A: Piece rate earnings sum to PKR 11,000 (5000 + 6000)");
assert(rec4.allowances === 1000, "Test 4B: Allowances included");
assert(rec4.grossSalary === 12000, "Test 4C: Gross wage is PKR 12,000 (11000 + 1000)");
assert(rec4.netPayable === 12000, "Test 4D: Net payable is PKR 12,000");

// -----------------------------------------------------------------------------
// Test 5: Full Payroll Run & Refresh Persistence
// -----------------------------------------------------------------------------
const allEmployees = [monthlyWorker, pieceWorker];
const run = processMonthlyPayrollRun({
  payrollMonth: "2026-08",
  departmentFilter: "all",
  employees: allEmployees,
  advancesList: activeAdvances,
  existingRuns: [],
});

assert(run.payrollNumber === "PAY-2026-001", "Test 5A: First run generates PAY-2026-001");
assert(run.employeesCount === 2, "Test 5B: Exactly 2 employees processed");
assert(run.totalGross === 50000 + 0, "Test 5C: Total gross calculated correctly");
assert(run.totalAdvanceDeductions === 5000, "Test 5D: Advance deductions sum to 5000");
assert(run.pendingCount === 2, "Test 5E: All 2 records start with Pending status");

// Mark first record paid
const { updatedRecord, payment } = markPayrollRecordPaid(run.records[0], "Bank Transfer", "FT-123456");
assert(updatedRecord.paymentStatus === "Paid", "Test 5F: Record marked as Paid");
assert(payment.paidAmount === updatedRecord.netPayable, "Test 5G: Payment disbursement record created");

// Save to mock storage
localStorageMock.setItem(PAYROLL_STORAGE_KEY, JSON.stringify([run]));
const reloaded = JSON.parse(localStorageMock.getItem(PAYROLL_STORAGE_KEY));
assert(reloaded.length === 1, "Test 5H: Payroll run persisted and reloaded from storage");
assert(reloaded[0].records.length === 2, "Test 5I: All payroll records intact across reload");

// Next Payroll Run Number
const nextRunNum = generateNextPayrollNumber(reloaded);
assert(nextRunNum === "PAY-2026-002", "Test 5J: Next run generates PAY-2026-002 sequentially");

console.log("================================================================");
console.log(`  Test Results: ${passed} Passed, ${failed} Failed`);
console.log("================================================================");
if (failed > 0) process.exit(1);
