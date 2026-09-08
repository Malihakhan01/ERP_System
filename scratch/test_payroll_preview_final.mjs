import {
  processMonthlyPayrollRun,
  calculateEmployeePayrollRecord,
  formatPKR,
} from "../lib/payroll-engine.ts";
import {
  getEmployeeAdvanceDeduction,
  getEmployeeActiveAdvance,
} from "../lib/advances-engine.ts";

console.log("=================================================");
console.log(" FactoryOS Payroll Preview Final Logic Audit Test ");
console.log("=================================================");

let pass = 0;
let fail = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    pass++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    fail++;
  }
}

// 1. Setup Mock Employees
const empDaily = {
  id: "emp_ali_001",
  employeeNumber: "EMP-2026-001",
  personalInfo: { fullName: "Ali Khan" },
  employmentInfo: { department: "Cutting", designation: "Operator", status: "Active" },
  salaryInfo: { salaryType: "daily", dailyRate: 4997 },
  isArchived: false,
};

const empMonthly = {
  id: "emp_ahmad_002",
  employeeNumber: "EMP-2026-002",
  personalInfo: { fullName: "Ahmad Ali Abbas" },
  employmentInfo: { department: "Quality Control", designation: "Cutting Operator", status: "Active" },
  salaryInfo: { salaryType: "monthly", monthlySalary: 56577 },
  isArchived: false,
};

const empWithAdvance = {
  id: "emp_maliha_003",
  employeeNumber: "EMP-2026-003",
  personalInfo: { fullName: "Maliha Tariq" },
  employmentInfo: { department: "Stitching", designation: "Stitcher", status: "Active" },
  salaryInfo: { salaryType: "monthly", monthlySalary: 2000 },
  isArchived: false,
};

// 2. Setup Mock Active Advance
const mockAdvances = [
  {
    id: "adv_maliha_001",
    advanceNumber: "ADV-2026-001",
    employeeId: "emp_maliha_003",
    employeeNumber: "EMP-2026-003",
    employeeName: "Maliha Tariq",
    department: "Stitching",
    designation: "Stitcher",
    currentSalary: 2000,
    requestedAmount: 2000,
    approvedAmount: 2000,
    reason: "Medical",
    repaymentMonths: 3,
    monthlyDeduction: 667,
    remainingBalance: 2000,
    status: "Recovering",
    requestDate: "2026-08-01",
    repayments: [
      {
        id: "rep_1",
        advanceId: "adv_maliha_001",
        employeeId: "emp_maliha_003",
        deductionMonth: "2026-08",
        amount: 667,
        balanceAfterDeduction: 1333,
        status: "Pending",
        createdAt: "2026-08-01",
      },
    ],
    isArchived: false,
    createdAt: "2026-08-01",
    updatedAt: "2026-08-01",
  },
];

// Test 1: Daily wage calculation (26 days * 4997 = 129,922)
const recDaily = calculateEmployeePayrollRecord({
  employee: empDaily,
  payrollMonth: "2026-08",
  workingDays: 26,
  presentDays: 26,
  advancesList: mockAdvances,
});

assert(recDaily.grossSalary === 129922, `Daily wage Gross equals 4,997 x 26 = 129,922 (Actual: ${recDaily.grossSalary})`);
assert(recDaily.advanceDeduction === 0, `Daily wage employee has 0 advance deduction (Actual: ${recDaily.advanceDeduction})`);
assert(recDaily.netPayable === 129922, `Daily wage Net equals Gross (Actual: ${recDaily.netPayable})`);

// Test 2: Monthly Fixed employee
const recMonthly = calculateEmployeePayrollRecord({
  employee: empMonthly,
  payrollMonth: "2026-08",
  workingDays: 26,
  presentDays: 26,
  advancesList: mockAdvances,
});

assert(recMonthly.grossSalary === 56577, `Monthly fixed Gross equals 56,577 (Actual: ${recMonthly.grossSalary})`);
assert(recMonthly.netPayable === 56577, `Monthly fixed Net equals 56,577 (Actual: ${recMonthly.netPayable})`);

// Test 3: Active advance installment recovery
const recAdvance = calculateEmployeePayrollRecord({
  employee: empWithAdvance,
  payrollMonth: "2026-08",
  workingDays: 26,
  presentDays: 26,
  advancesList: mockAdvances,
});

assert(recAdvance.grossSalary === 2000, `Employee with advance Gross equals 2,000 (Actual: ${recAdvance.grossSalary})`);
assert(recAdvance.advanceDeduction === 667, `Advance installment correctly deducted as 667 (Actual: ${recAdvance.advanceDeduction})`);
assert(recAdvance.remainingAdvanceBalance === 1333, `Remaining advance balance equals 2000 - 667 = 1333 (Actual: ${recAdvance.remainingAdvanceBalance})`);
assert(recAdvance.netPayable === 1333, `Net Payable equals 2000 - 667 = 1333 (Actual: ${recAdvance.netPayable})`);

// Test 4: Overall Monthly Payroll Run Aggregates
const run = processMonthlyPayrollRun({
  payrollMonth: "2026-08",
  employees: [empDaily, empMonthly, empWithAdvance],
  advancesList: mockAdvances,
  workingDays: 26,
});

const expectedGross = 129922 + 56577 + 2000; // 188,499
const expectedAdvance = 667;
const expectedNet = expectedGross - expectedAdvance; // 187,832

assert(run.totalGross === expectedGross, `Total Gross Payroll matches sum (${expectedGross} vs ${run.totalGross})`);
assert(run.totalAdvanceDeductions === expectedAdvance, `Total Advance Recovery matches (${expectedAdvance} vs ${run.totalAdvanceDeductions})`);
assert(run.totalDeductions === expectedAdvance, `Total Deductions equals Advance + Other (${expectedAdvance} vs ${run.totalDeductions})`);
assert(run.totalNetPayable === expectedNet, `Total Net Payable matches sum (${expectedNet} vs ${run.totalNetPayable})`);

console.log("=================================================");
console.log(` Test Result: ${pass}/${pass + fail} Tests Passed successfully!`);
console.log("=================================================");
