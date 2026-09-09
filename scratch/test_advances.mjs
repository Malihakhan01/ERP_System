// scratch/test_advances.mjs
// Comprehensive automated test suite for FactoryOS Advances & Loan Recovery Module (30+ Tests)

import assert from "node:assert/strict";
import {
  generateNextAdvanceNumber,
  calculateMonthlyDeduction,
  generateRepaymentSchedule,
  createAdvanceRequest,
  approveAdvance,
  disburseAdvance,
  rejectAdvance,
  recordRepaymentInstallment,
  getEmployeeAdvanceDeduction,
  getEmployeeLoanSummary,
  computeAdvanceMetrics,
  validateAdvanceRequest,
  getEmployeeActiveAdvance,
  deduplicateAndFixAdvances,
  ADVANCE_STORAGE_KEY,
} from "../lib/advances-engine.ts";
import {
  mapAdvanceRecordToRow,
  mapRowToAdvanceRecord,
} from "../lib/services/-service.ts";
import { createBlankEmployeeRecord, formatPKR } from "../lib/employees-engine.ts";

console.log("================================================================");
console.log("  FactoryOS Garment ERP — Advances Module Complete Test Suite");
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

// 1. Advance ID Generator
runTest(1, "Sequential Advance ID generator format (ADV-YYYY-NNN)", () => {
  const currentYear = new Date().getFullYear();
  const id1 = generateNextAdvanceNumber([]);
  assert.equal(id1, `ADV-${currentYear}-001`);

  const id2 = generateNextAdvanceNumber([{ advanceNumber: `ADV-${currentYear}-001` }]);
  assert.equal(id2, `ADV-${currentYear}-002`);

  const id10 = generateNextAdvanceNumber([{ advanceNumber: `ADV-${currentYear}-009` }]);
  assert.equal(id10, `ADV-${currentYear}-010`);
});

// 2. Monthly deduction calculation
runTest(2, "Monthly deduction calculation with rounding", () => {
  assert.equal(calculateMonthlyDeduction(20000, 4), 5000);
  assert.equal(calculateMonthlyDeduction(25000, 3), 8334);
  assert.equal(calculateMonthlyDeduction(0, 3), 0);
  assert.equal(calculateMonthlyDeduction(10000, 0), 0);
});

// 3. Repayment schedule generation
runTest(3, "Generate month-by-month repayment schedule", () => {
  const schedule = generateRepaymentSchedule("adv_1", "emp_1", 20000, 4, new Date("2026-08-15"));
  assert.equal(schedule.length, 4);
  assert.equal(schedule[0].amount, 5000);
  assert.equal(schedule[0].status, "Pending");
  assert.equal(schedule[0].balanceAfterDeduction, 15000);
  assert.equal(schedule[3].balanceAfterDeduction, 0);
});

// 4. Remainder distribution in repayment schedule
runTest(4, "Repayment schedule handles uneven division correctly (no lost rupees)", () => {
  const schedule = generateRepaymentSchedule("adv_2", "emp_2", 10000, 3, new Date("2026-08-01"));
  assert.equal(schedule.length, 3);
  const total = schedule.reduce((sum, item) => sum + item.amount, 0);
  assert.equal(total, 10000); // 3334 + 3333 + 3333 = 10000
});

// 5. Create advance request
runTest(5, "Create advance request initializes with Pending status", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.id = "emp_101";
  emp.employeeNumber = "EMP-2026-001";
  emp.personalInfo.fullName = "Ali Khan";
  emp.employmentInfo.department = "Cutting";
  emp.employmentInfo.designation = "Senior Cutting Master";
  emp.salaryInfo.monthlySalary = 50000;

  const adv = createAdvanceRequest(emp, 20000, "Medical emergency", 4, []);
  assert.equal(adv.advanceNumber, `ADV-${new Date().getFullYear()}-001`);
  assert.equal(adv.employeeId, "emp_101");
  assert.equal(adv.requestedAmount, 20000);
  assert.equal(adv.approvedAmount, 20000);
  assert.equal(adv.remainingBalance, 20000);
  assert.equal(adv.monthlyDeduction, 5000);
  assert.equal(adv.status, "Pending");
  assert.equal(adv.repayments.length, 0);
});

// 6. Approve advance
runTest(6, "Admin approves advance sets status to Approved", () => {
  const emp = createBlankEmployeeRecord([]);
  const adv = createAdvanceRequest(emp, 20000, "Emergency", 4, []);
  const approved = approveAdvance(adv, 18000, "Director HR", "Approved 18k");
  assert.equal(approved.status, "Approved");
  assert.equal(approved.approvedAmount, 18000);
  assert.equal(approved.monthlyDeduction, 4500);
  assert.equal(approved.approvedBy, "Director HR");
});

// 7. Disburse advance
runTest(7, "Disburse advance creates recovery schedule and sets status to Recovering", () => {
  const emp = createBlankEmployeeRecord([]);
  const adv = createAdvanceRequest(emp, 20000, "Emergency", 4, []);
  const approved = approveAdvance(adv, 20000, "Director HR");
  const disbursed = disburseAdvance(approved, "Finance Desk", new Date("2026-08-01"));
  assert.equal(disbursed.status, "Recovering");
  assert.equal(disbursed.disbursedBy, "Finance Desk");
  assert.equal(disbursed.repayments.length, 4);
  assert.equal(disbursed.remainingBalance, 20000);
});

// 8. Record repayment installment
runTest(8, "Record repayment installment decreases balance and marks installment Paid", () => {
  const emp = createBlankEmployeeRecord([]);
  const adv = createAdvanceRequest(emp, 20000, "Emergency", 4, []);
  const disbursed = disburseAdvance(adv, "Finance Desk", new Date("2026-08-01"));
  const firstMonth = disbursed.repayments[0].deductionMonth;

  const afterFirstPayment = recordRepaymentInstallment(disbursed, firstMonth, 5000, "payroll_aug");
  assert.equal(afterFirstPayment.remainingBalance, 15000);
  assert.equal(afterFirstPayment.status, "Recovering");
  assert.equal(afterFirstPayment.repayments[0].status, "Paid");
  assert.equal(afterFirstPayment.repayments[0].payrollRunId, "payroll_aug");
});

// 9. Auto completion when fully repaid
runTest(9, "Advance status transitions to Completed when remaining balance is 0", () => {
  const emp = createBlankEmployeeRecord([]);
  const adv = createAdvanceRequest(emp, 5000, "Emergency", 1, []);
  const disbursed = disburseAdvance(adv, "Finance Desk", new Date("2026-08-01"));
  const month = disbursed.repayments[0].deductionMonth;

  const completed = recordRepaymentInstallment(disbursed, month, 5000);
  assert.equal(completed.remainingBalance, 0);
  assert.equal(completed.status, "Completed");
});

// 10. Reject advance
runTest(10, "Reject advance sets status to Rejected", () => {
  const emp = createBlankEmployeeRecord([]);
  const adv = createAdvanceRequest(emp, 20000, "Emergency", 4, []);
  const rejected = rejectAdvance(adv, "Exceeds loan limits", "HR Manager");
  assert.equal(rejected.status, "Rejected");
  assert.ok(rejected.notes.includes("Rejected by HR Manager"));
});

// 11. Payroll Ready Hook single advance
runTest(11, "Payroll Hook getEmployeeAdvanceDeduction returns accurate monthly deduction", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.id = "emp_100";
  const adv = createAdvanceRequest(emp, 20000, "Emergency", 4, []);
  const disbursed = disburseAdvance(adv, "Finance Desk", new Date("2026-08-01"));
  const firstMonth = disbursed.repayments[0].deductionMonth;

  const payrollDeduction = getEmployeeAdvanceDeduction("emp_100", firstMonth, [disbursed]);
  assert.equal(payrollDeduction.totalDeduction, 5000);
  assert.equal(payrollDeduction.activeAdvanceIds.length, 1);
  assert.equal(payrollDeduction.deductionBreakdown[0].amount, 5000);
});

// 12. Payroll Hook multi-advance accumulation
runTest(12, "Payroll Hook accumulates deductions when employee has multiple active advances", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.id = "emp_multi";
  const adv1 = disburseAdvance(createAdvanceRequest(emp, 12000, "Loan 1", 3, []), "Finance", new Date("2026-08-01"));
  const adv2 = disburseAdvance(createAdvanceRequest(emp, 6000, "Loan 2", 2, []), "Finance", new Date("2026-08-01"));
  const targetMonth = adv1.repayments[0].deductionMonth;

  const hook = getEmployeeAdvanceDeduction("emp_multi", targetMonth, [adv1, adv2]);
  assert.equal(hook.totalDeduction, 4000 + 3000); // 4000 + 3000 = 7000
  assert.equal(hook.activeAdvanceIds.length, 2);
});

// 13. Employee Loan Summary for Profile
runTest(13, "getEmployeeLoanSummary computes total taken, recovered, and active count", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.id = "emp_200";
  const adv1 = createAdvanceRequest(emp, 20000, "Emergency", 4, []);
  const disbursed = disburseAdvance(adv1, "Finance", new Date("2026-08-01"));
  const afterPay = recordRepaymentInstallment(disbursed, disbursed.repayments[0].deductionMonth, 5000);

  const summary = getEmployeeLoanSummary("emp_200", [afterPay]);
  assert.equal(summary.totalTaken, 20000);
  assert.equal(summary.recovered, 5000);
  assert.equal(summary.remaining, 15000);
  assert.equal(summary.activeLoansCount, 1);
});

// 14. Dynamic Advance Dashboard KPIs
runTest(14, "computeAdvanceMetrics computes counts and exposure correctly", () => {
  const emp = createBlankEmployeeRecord([]);
  const advPending = createAdvanceRequest(emp, 10000, "Pending Loan", 2, []);
  const advActive = disburseAdvance(createAdvanceRequest(emp, 30000, "Active Loan", 3, []), "Finance");

  const metrics = computeAdvanceMetrics([advPending, advActive]);
  assert.equal(metrics.totalAdvances, 2);
  assert.equal(metrics.pendingApprovalCount, 1);
  assert.equal(metrics.activeLoansCount, 1);
  assert.equal(metrics.totalPrincipalExposure, 30000);
});

// 15. Validation Rules basic checks
runTest(15, "validateAdvanceRequest enforces positive amounts and employee selection", () => {
  const v1 = validateAdvanceRequest({ employeeId: "", requestedAmount: 0, reason: "", repaymentMonths: 0 });
  assert.equal(v1.isValid, false);
  assert.ok(v1.errors.employeeId);
  assert.ok(v1.errors.requestedAmount);
  assert.ok(v1.errors.reason);
  assert.ok(v1.errors.repaymentMonths);
});

// 16. Validation warns if loan exceeds 100% of monthly salary
runTest(16, "validateAdvanceRequest warns if amount exceeds 100% of monthly salary", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.salaryInfo.monthlySalary = 40000;
  const v = validateAdvanceRequest(
    { employeeId: "emp_1", requestedAmount: 50000, reason: "Medical", repaymentMonths: 6 },
    emp
  );
  assert.equal(v.isValid, true);
  assert.ok(v.warnings.length > 0);
});

// 17. Validation blocks advance exceeding 200% of salary
runTest(17, "validateAdvanceRequest rejects loan exceeding 200% of monthly wage", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.salaryInfo.monthlySalary = 40000;
  const v = validateAdvanceRequest(
    { employeeId: "emp_1", requestedAmount: 90000, reason: "Excessive", repaymentMonths: 6 },
    emp
  );
  assert.equal(v.isValid, false);
  assert.ok(v.errors.requestedAmount);
});

// 18. Daily Wage Employee Salary Conversion for Advance Limit
runTest(18, "Daily wage worker monthly equivalent calculation (26 days)", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.salaryInfo.salaryType = "daily";
  emp.salaryInfo.dailyRate = 1800; // 1800 * 26 = 46,800

  const adv = createAdvanceRequest(emp, 20000, "Advance", 2, []);
  assert.equal(adv.currentSalary, 46800);
});

// 19. Multi-month repayment sequence
runTest(19, "Sequential multi-month installment completion", () => {
  const emp = createBlankEmployeeRecord([]);
  let adv = disburseAdvance(createAdvanceRequest(emp, 15000, "Tool loan", 3, []), "Finance", new Date("2026-08-01"));

  // Month 1
  adv = recordRepaymentInstallment(adv, adv.repayments[0].deductionMonth, 5000);
  assert.equal(adv.remainingBalance, 10000);
  assert.equal(adv.status, "Recovering");

  // Month 2
  adv = recordRepaymentInstallment(adv, adv.repayments[1].deductionMonth, 5000);
  assert.equal(adv.remainingBalance, 5000);
  assert.equal(adv.status, "Recovering");

  // Month 3
  adv = recordRepaymentInstallment(adv, adv.repayments[2].deductionMonth, 5000);
  assert.equal(adv.remainingBalance, 0);
  assert.equal(adv.status, "Completed");
});

// 20. Overpayment safety (balance cannot become negative)
runTest(20, "Repayment installment caps remaining balance at 0 (never negative)", () => {
  const emp = createBlankEmployeeRecord([]);
  let adv = disburseAdvance(createAdvanceRequest(emp, 5000, "Short loan", 1, []), "Finance");
  adv = recordRepaymentInstallment(adv, adv.repayments[0].deductionMonth, 6000);
  assert.equal(adv.remainingBalance, 0);
  assert.equal(adv.status, "Completed");
});

// 21. Partial installment payment
runTest(21, "Partial installment payment leaves remaining balance open", () => {
  const emp = createBlankEmployeeRecord([]);
  let adv = disburseAdvance(createAdvanceRequest(emp, 10000, "Loan", 2, []), "Finance");
  adv = recordRepaymentInstallment(adv, adv.repayments[0].deductionMonth, 3000); // 3000 paid instead of 5000
  assert.equal(adv.remainingBalance, 7000);
  assert.equal(adv.status, "Recovering");
});

// 22. Archived advance exclusion
runTest(22, "Archived advances excluded from active employee loan calculations", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.id = "emp_arch";
  const adv = createAdvanceRequest(emp, 20000, "Old Loan", 2, []);
  adv.isArchived = true;

  const summary = getEmployeeLoanSummary("emp_arch", [adv]);
  assert.equal(summary.activeLoansCount, 0);
  assert.equal(summary.remaining, 0);
});

// 23. Rejected advance exclusion from loan liability
runTest(23, "Rejected advances do not count towards employee debt liability", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.id = "emp_rej";
  const adv = rejectAdvance(createAdvanceRequest(emp, 25000, "Rejected Loan", 3, []), "Limit exceeded");

  const summary = getEmployeeLoanSummary("emp_rej", [adv]);
  assert.equal(summary.totalTaken, 0);
  assert.equal(summary.remaining, 0);
  assert.equal(summary.activeLoansCount, 0);
});

// 24. Repayment schedule date formatting
runTest(24, "Repayment schedule correctly creates 12-month calendar labels", () => {
  const schedule = generateRepaymentSchedule("adv_12", "emp_12", 24000, 12, new Date("2026-01-01"));
  assert.equal(schedule.length, 12);
  assert.equal(schedule[0].deductionMonth, "Feb 2026");
  assert.equal(schedule[11].deductionMonth, "Jan 2027");
});

// 25. Storage Key Consistency
runTest(25, "Storage key consistency for advances", () => {
  assert.equal(ADVANCE_STORAGE_KEY, "factoryos_advances");
});

// 26. Currency formatter PKR
runTest(26, "Currency formatter PKR formats amounts with thousand separators", () => {
  assert.equal(formatPKR(25000), "PKR 25,000");
  assert.equal(formatPKR(0), "PKR 0");
});

// 27. Database Database Row Mapping
runTest(27, "Map AdvanceRecord to PostgreSQL row and back", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.id = "emp_db_1";
  const adv = createAdvanceRequest(emp, 25000, "Home Renovation", 5, []);
  const row = mapAdvanceRecordToRow(adv);
  assert.equal(row.advance_number, adv.advanceNumber);
  assert.equal(row.requested_amount, 25000);
  assert.equal(row.repayment_months, 5);

  const mockDbRow = {
    id: "uuid-1234",
    advance_number: "ADV-2026-008",
    employee_id: "emp_db_1",
    requested_amount: 25000,
    approved_amount: 25000,
    reason: "Home Renovation",
    repayment_months: 5,
    monthly_deduction: 5000,
    remaining_balance: 25000,
    status: "Pending",
    request_date: "2026-08-29",
    employees: {
      employee_number: "EMP-2026-008",
      full_name: "Zubair Ahmed",
      department: "Stitching",
      designation: "Tailor",
      monthly_salary: 42000,
    },
  };

  const restored = mapRowToAdvanceRecord(mockDbRow, []);
  assert.equal(restored.id, "uuid-1234");
  assert.equal(restored.advanceNumber, "ADV-2026-008");
  assert.equal(restored.employeeName, "Zubair Ahmed");
  assert.equal(restored.department, "Stitching");
  assert.equal(restored.requestedAmount, 25000);
});

// 28. Database Repayments mapping
runTest(28, "Map Database advance_repayments rows to AdvanceRepaymentItem", () => {
  const mockDbRow = {
    id: "adv_uuid",
    advance_number: "ADV-2026-015",
    employee_id: "emp_1",
    requested_amount: 10000,
    approved_amount: 10000,
    remaining_balance: 5000,
    status: "Recovering",
  };

  const mockRepayments = [
    { id: "rep_1", advance_id: "adv_uuid", employee_id: "emp_1", deduction_month: "Sep 2026", amount: 5000, balance_after_deduction: 5000, status: "Paid" },
    { id: "rep_2", advance_id: "adv_uuid", employee_id: "emp_1", deduction_month: "Oct 2026", amount: 5000, balance_after_deduction: 0, status: "Pending" },
  ];

  const restored = mapRowToAdvanceRecord(mockDbRow, mockRepayments);
  assert.equal(restored.repayments.length, 2);
  assert.equal(restored.repayments[0].status, "Paid");
  assert.equal(restored.repayments[1].status, "Pending");
});

// 29. Fast Search filter matching
runTest(29, "Advances search matches by Advance number and Employee name", () => {
  const list = [
    { advanceNumber: "ADV-2026-001", employeeName: "Tariq Mahmood" },
    { advanceNumber: "ADV-2026-002", employeeName: "Bilal Hassan" },
  ];

  const searchTariq = list.filter((a) => a.employeeName.toLowerCase().includes("tariq"));
  assert.equal(searchTariq.length, 1);

  const searchAdv2 = list.filter((a) => a.advanceNumber.toLowerCase().includes("adv-2026-002"));
  assert.equal(searchAdv2.length, 1);
});

// 31. Active Loan Detection
runTest(31, "getEmployeeActiveAdvance accurately identifies pending/recovering loans", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.id = "emp_active_test";
  const advPending = createAdvanceRequest(emp, 10000, "Medical", 2, []);
  assert.ok(getEmployeeActiveAdvance("emp_active_test", [advPending]));

  const advCompleted = { ...advPending, status: "Completed", remainingBalance: 0 };
  assert.equal(getEmployeeActiveAdvance("emp_active_test", [advCompleted]), null);
});

// 32. Block new advance when active loan exists
runTest(32, "validateAdvanceRequest blocks new request if employee already has active loan", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.id = "emp_dup_block";
  emp.salaryInfo.monthlySalary = 45000;
  const existingActive = disburseAdvance(createAdvanceRequest(emp, 20000, "Old Loan", 4, []), "Finance");

  const validation = validateAdvanceRequest(
    { employeeId: "emp_dup_block", requestedAmount: 15000, reason: "New Loan", repaymentMonths: 3 },
    emp,
    [existingActive]
  );
  assert.equal(validation.isValid, false);
  assert.ok(validation.errors.employeeId.includes("Existing advance pending recovery"));
});

// 33. Allow new advance once previous loan is fully Completed
runTest(33, "validateAdvanceRequest allows new advance if previous loan is Completed", () => {
  const emp = createBlankEmployeeRecord([]);
  emp.id = "emp_cleared";
  emp.salaryInfo.monthlySalary = 45000;
  const oldLoan = createAdvanceRequest(emp, 20000, "Old Loan", 4, []);
  oldLoan.status = "Completed";
  oldLoan.remainingBalance = 0;

  const validation = validateAdvanceRequest(
    { employeeId: "emp_cleared", requestedAmount: 15000, reason: "New Loan", repaymentMonths: 3 },
    emp,
    [oldLoan]
  );
  assert.equal(validation.isValid, true);
});

// 34. Deduplicate and fix duplicate advance numbers
runTest(34, "deduplicateAndFixAdvances fixes collided ADV-2026-001 into sequential unique numbers", () => {
  const corruptedList = [
    { id: "1", advanceNumber: "ADV-2026-001", requestedAmount: 10000 },
    { id: "2", advanceNumber: "ADV-2026-001", requestedAmount: 20000 }, // Duplicate!
    { id: "3", advanceNumber: "ADV-2026-001", requestedAmount: 30000 }, // Duplicate!
  ];

  const fixed = deduplicateAndFixAdvances(corruptedList);
  assert.equal(fixed.length, 3);
  assert.equal(fixed[0].advanceNumber, "ADV-2026-001");
  assert.equal(fixed[1].advanceNumber, "ADV-2026-002");
  assert.equal(fixed[2].advanceNumber, "ADV-2026-003");
});

console.log("================================================================");
console.log(`  Test Results: ${passed} Passed, ${failed} Failed`);
console.log("================================================================");

if (failed > 0) process.exit(1);
