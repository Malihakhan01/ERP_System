// scratch/test_payroll_engine_audit.mjs
// Comprehensive Automated Test Suite for FactoryOS Payroll Calculation Engine

import { calculateEmployeePayrollRecord, processMonthlyPayrollRun, formatPKR } from "../lib/payroll-engine.ts";
import { createBlankEmployeeRecord } from "../lib/employees-engine.ts";

console.log("=================================================");
console.log(" FactoryOS Payroll Calculation Engine Audit Test ");
console.log("=================================================\n");

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// ----------------------------------------------------------------------
// Test 1: Monthly Fixed Employee (50,000 -> Gross 50,000, Net 50,000)
// ----------------------------------------------------------------------
const monthlyEmp = createBlankEmployeeRecord([]);
monthlyEmp.id = "emp_monthly_01";
monthlyEmp.employeeNumber = "EMP-2026-001";
monthlyEmp.personalInfo.fullName = "Ahmad Hassan";
monthlyEmp.employmentInfo.department = "Cutting";
monthlyEmp.employmentInfo.designation = "Pattern Master";
monthlyEmp.salaryInfo.salaryType = "monthly";
monthlyEmp.salaryInfo.monthlySalary = 50000;

const rec1 = calculateEmployeePayrollRecord({
  employee: monthlyEmp,
  payrollMonth: "2026-08",
  workingDays: 26,
  presentDays: 26,
  advancesList: [],
});

assert(rec1.grossSalary === 50000, `Test 1.1: Monthly Employee Gross Salary equals 50,000 (Actual: ${rec1.grossSalary})`);
assert(rec1.totalDeductions === 0, `Test 1.2: Monthly Employee Deductions equal 0 (Actual: ${rec1.totalDeductions})`);
assert(rec1.netPayable === 50000, `Test 1.3: Monthly Employee Net Payable equals 50,000 (Actual: ${rec1.netPayable})`);

// ----------------------------------------------------------------------
// Test 2: Daily Wage Employee (Daily Rate: 2000, Present: 25 days -> Gross: 50,000)
// ----------------------------------------------------------------------
const dailyEmp = createBlankEmployeeRecord([]);
dailyEmp.id = "emp_daily_01";
dailyEmp.employeeNumber = "EMP-2026-002";
dailyEmp.personalInfo.fullName = "Muhammad Imran";
dailyEmp.employmentInfo.department = "Stitching";
dailyEmp.employmentInfo.designation = "Machine Operator";
dailyEmp.salaryInfo.salaryType = "daily";
dailyEmp.salaryInfo.dailyRate = 2000;

const rec2 = calculateEmployeePayrollRecord({
  employee: dailyEmp,
  payrollMonth: "2026-08",
  workingDays: 26,
  presentDays: 25,
  advancesList: [],
});

assert(rec2.grossSalary === 50000, `Test 2.1: Daily Wage Employee Gross equals 2000 x 25 = 50,000 (Actual: ${rec2.grossSalary})`);
assert(rec2.netPayable === 50000, `Test 2.2: Daily Wage Employee Net Payable equals 50,000 (Actual: ${rec2.netPayable})`);

// ----------------------------------------------------------------------
// Test 3: Employee With Advance (Salary: 50,000, Advance Deduction: 5,000 -> Net: 45,000)
// ----------------------------------------------------------------------
const advanceEmp = createBlankEmployeeRecord([]);
advanceEmp.id = "emp_advance_01";
advanceEmp.employeeNumber = "EMP-2026-003";
advanceEmp.personalInfo.fullName = "Rashid Khan";
advanceEmp.employmentInfo.department = "Finishing";
advanceEmp.employmentInfo.designation = "Iron Operator";
advanceEmp.salaryInfo.salaryType = "monthly";
advanceEmp.salaryInfo.monthlySalary = 50000;

const mockAdvances = [
  {
    id: "adv_001",
    advanceNumber: "ADV-2026-001",
    employeeId: "emp_advance_01",
    employeeNumber: "EMP-2026-003",
    employeeName: "Rashid Khan",
    department: "Finishing",
    designation: "Iron Operator",
    currentSalary: 50000,
    requestedAmount: 15000,
    approvedAmount: 15000,
    reason: "Family Emergency",
    repaymentMonths: 3,
    monthlyDeduction: 5000,
    remainingBalance: 15000,
    status: "Recovering",
    requestDate: "2026-08-01",
    isArchived: false,
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    repayments: [
      {
        id: "rep_01",
        advanceId: "adv_001",
        employeeId: "emp_advance_01",
        deductionMonth: "2026-08",
        amount: 5000,
        balanceAfterDeduction: 10000,
        status: "Pending",
        createdAt: "2026-08-01T00:00:00Z",
      }
    ]
  }
];

const rec3 = calculateEmployeePayrollRecord({
  employee: advanceEmp,
  payrollMonth: "2026-08",
  workingDays: 26,
  presentDays: 26,
  advancesList: mockAdvances,
});

assert(rec3.grossSalary === 50000, `Test 3.1: Employee with Advance Gross equals 50,000 (Actual: ${rec3.grossSalary})`);
assert(rec3.advanceDeduction === 5000, `Test 3.2: Advance Deduction equals 5,000 (Actual: ${rec3.advanceDeduction})`);
assert(rec3.totalDeductions === 5000, `Test 3.3: Total Deductions equal 5,000 (Actual: ${rec3.totalDeductions})`);
assert(rec3.netPayable === 45000, `Test 3.4: Net Payable equals 50,000 - 5,000 = 45,000 (Actual: ${rec3.netPayable})`);
assert(rec3.remainingAdvanceBalance === 10000, `Test 3.5: Remaining Advance Balance equals 10,000 (Actual: ${rec3.remainingAdvanceBalance})`);

// ----------------------------------------------------------------------
// Test 4: Multiple Employees Aggregate Verification
// ----------------------------------------------------------------------
const allEmployees = [monthlyEmp, dailyEmp, advanceEmp];
const payrollRun = processMonthlyPayrollRun({
  payrollMonth: "2026-08",
  departmentFilter: "all",
  employees: allEmployees,
  advancesList: mockAdvances,
  workingDays: 26,
  customInputs: {
    emp_daily_01: { presentDays: 25 },
  }
});

const expectedTotalGross = 50000 + 50000 + 50000; // 150,000
const expectedTotalAdvanceDed = 5000;
const expectedTotalNet = 50000 + 50000 + 45000; // 145,000

assert(payrollRun.records.length === 3, `Test 4.1: Processed 3 employee records (Actual: ${payrollRun.records.length})`);
assert(payrollRun.totalGross === expectedTotalGross, `Test 4.2: Total Gross Summary equals Sum of Employee Gross (Expected: 150,000, Actual: ${payrollRun.totalGross})`);
assert(payrollRun.totalAdvanceDeductions === expectedTotalAdvanceDed, `Test 4.3: Total Advance Deductions equals 5,000 (Actual: ${payrollRun.totalAdvanceDeductions})`);
assert(payrollRun.totalNetPayable === expectedTotalNet, `Test 4.4: Total Net Payable equals Sum of Employee Net (Expected: 145,000, Actual: ${payrollRun.totalNetPayable})`);

console.log("\n=================================================");
console.log(` Test Result: ${passedTests}/${totalTests} Tests Passed successfully!`);
console.log("=================================================");
