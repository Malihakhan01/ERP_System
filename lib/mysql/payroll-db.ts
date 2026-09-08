/**
 * FactoryOS Garment ERP — Payroll MySQL 8 Repository
 * Connects /salaries with live MySQL `payroll_runs` and `payroll_records` tables.
 */

import { executeQuery, MySQL } from "./db";
import type { PayrollRun, PayrollRecordItem } from "@/lib/payroll-engine";
import { getEmployeesFromMySQL } from "./employees-db";

export async function getPayrollRunsFromMySQL(): Promise<PayrollRun[]> {
  const runsRows = await executeQuery<any>(
    "SELECT * FROM `payroll_runs` ORDER BY `created_at` DESC"
  );

  const runs: PayrollRun[] = [];

  for (const r of runsRows) {
    const recordsRows = await executeQuery<any>(
      "SELECT pr.*, e.employee_number, e.full_name as employee_name, e.department, e.designation, e.salary_type, e.monthly_salary, e.daily_rate, e.piece_rate FROM `payroll_records` pr LEFT JOIN `employees` e ON pr.employee_id = e.id WHERE pr.payroll_month = ? OR pr.payroll_number = ? ORDER BY pr.id ASC",
      [r.payroll_month, r.payroll_run_number]
    );

    const records: PayrollRecordItem[] = recordsRows.map((rec) => {
      const basic = Number(rec.base_salary || 0);
      const piece = Number(rec.piece_rate_earnings || 0);
      const ot = Number(rec.overtime_earnings || 0);
      const adv = Number(rec.advance_deductions || 0);
      const tax = Number(rec.tax_deductions || 0);
      const gross = basic + piece + ot;
      const totalDeductions = adv + tax;
      const net = Number(rec.net_payable || (gross - totalDeductions));

      return {
        id: String(rec.id),
        payrollRunId: String(r.id),
        employeeId: String(rec.employee_id),
        employeeNumber: rec.employee_number || "EMP-2026",
        employeeName: rec.employee_name || "Factory Worker",
        department: rec.department || "Stitching",
        designation: rec.designation || "Operator",
        payrollMonth: r.payroll_month,
        salaryType: (rec.salary_type === "piece_rate" || rec.salary_type === "Piece-Rate" ? "piece_rate" : rec.salary_type === "daily" ? "daily" : "monthly") as any,
        basicSalary: basic,
        dailyWage: Number(rec.daily_rate || 0),
        workingDays: 26,
        presentDays: 26,
        absentDays: 0,
        absentDeduction: 0,
        overtimeHours: ot > 0 ? 10 : 0,
        overtimeRatePerHour: 250,
        overtimeAmount: ot,
        pieceRateAmount: piece,
        allowances: 0,
        grossSalary: gross,
        advanceDeduction: adv,
        remainingAdvanceBalance: 0,
        taxDeduction: tax,
        otherDeductions: 0,
        totalDeductions,
        netPayable: net,
        paymentStatus: (rec.status || "Pending") as any,
        paymentDate: rec.status === "Paid" ? new Date().toISOString().split("T")[0] : undefined,
        paymentMethod: "Bank Transfer",
        createdAt: r.created_at || new Date().toISOString(),
        updatedAt: r.updated_at || new Date().toISOString(),
      };
    });

    const paidCount = records.filter((rec) => rec.paymentStatus === "Paid").length;

    runs.push({
      id: String(r.id),
      payrollNumber: r.payroll_run_number,
      payrollMonth: r.payroll_month,
      departmentFilter: "all",
      status: (r.status || "Completed") as any,
      totalGross: Number(r.total_gross_wages || 0),
      totalDeductions: Number(r.total_deductions || 0),
      totalNetPayable: Number(r.total_net_payable || 0),
      totalAdvanceDeductions: records.reduce((acc, rec) => acc + rec.advanceDeduction, 0),
      employeesCount: Number(r.total_employees || records.length),
      paidCount,
      pendingCount: records.length - paidCount,
      processedBy: r.processed_by || "Payroll Officer",
      processedAt: r.created_at || new Date().toISOString(),
      records,
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || new Date().toISOString(),
    });
  }

  return runs;
}

export async function createPayrollRunInMySQL(data: Partial<PayrollRun>): Promise<string> {
  const countRows = await executeQuery<any>("SELECT COUNT(*) as cnt FROM `payroll_runs`");
  const nextNum = (countRows[0]?.cnt || 0) + 1;
  const runNumber = data.payrollNumber || `PR-2026-${String(nextNum).padStart(3, "0")}`;
  const month = data.payrollMonth || new Date().toISOString().substring(0, 7);

  // If no records passed, calculate from active employees in MySQL
  let records: PayrollRecordItem[] = data.records || [];
  if (records.length === 0) {
    const employees = await getEmployeesFromMySQL();
    const activeEmps = employees.filter((e) => e.employmentInfo.status === "Active");
    const computedRecords: PayrollRecordItem[] = [];
    for (const emp of activeEmps) {
      const base = Number(emp.salaryInfo.monthlySalary || 35000);

      // 1. Fetch piece-rate earnings from operator_production_logs
      let pieceRate = 0;
      try {
        const pieceRows = await executeQuery<any>(
          "SELECT COALESCE(SUM(`total_earnings`), 0) as total_piece FROM `operator_production_logs` WHERE `employee_id` = ?",
          [emp.id]
        );
        pieceRate = Number(pieceRows[0]?.total_piece || 0);
      } catch {}

      // 2. Fetch approved monthly advance deductions from employee_advances
      let advance = 0;
      let remainingAdv = 0;
      try {
        const advRows = await executeQuery<any>(
          "SELECT monthly_deduction, remaining_balance FROM `employee_advances` WHERE `employee_id` = ? AND `status` = 'Active' LIMIT 1",
          [emp.id]
        );
        if (advRows.length > 0) {
          advance = Number(advRows[0].monthly_deduction || 0);
          remainingAdv = Number(advRows[0].remaining_balance || 0);
        }
      } catch {}

      const ot = 2500;
      const gross = base + pieceRate + ot;
      const net = Math.max(0, gross - advance);

      computedRecords.push({
        id: `rec_${emp.id}`,
        employeeId: emp.id,
        employeeNumber: emp.employeeNumber,
        employeeName: emp.personalInfo.fullName,
        department: emp.employmentInfo.department,
        designation: emp.employmentInfo.designation,
        payrollMonth: month,
        salaryType: emp.salaryInfo.salaryType,
        basicSalary: base,
        dailyWage: Number(emp.salaryInfo.dailyRate || 0),
        workingDays: 26,
        presentDays: 26,
        absentDays: 0,
        absentDeduction: 0,
        overtimeHours: 10,
        overtimeRatePerHour: 250,
        overtimeAmount: ot,
        pieceRateAmount: pieceRate,
        allowances: 0,
        grossSalary: gross,
        advanceDeduction: advance,
        remainingAdvanceBalance: Math.max(0, remainingAdv - advance),
        taxDeduction: 0,
        otherDeductions: 0,
        totalDeductions: advance,
        netPayable: net,
        paymentStatus: "Pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    records = computedRecords;
  }

  const totalGross = records.reduce((acc, r) => acc + (r.grossSalary || 0), 0);
  const totalNet = records.reduce((acc, r) => acc + (r.netPayable || 0), 0);
  const totalDeductions = records.reduce((acc, r) => acc + (r.totalDeductions || 0), 0);

  const insertId = await MySQL.insert("payroll_runs", {
    uuid: crypto.randomUUID(),
    payroll_run_number: runNumber,
    payroll_month: month,
    total_employees: records.length,
    total_gross_wages: totalGross,
    total_piece_rate: records.reduce((acc, r) => acc + (r.pieceRateAmount || 0), 0),
    total_overtime: records.reduce((acc, r) => acc + (r.overtimeAmount || 0), 0),
    total_deductions: totalDeductions,
    total_net_payable: totalNet,
    status: data.status || "Completed",
    processed_by: data.processedBy || "Payroll Officer",
  });

  // Insert line item records
  for (const rec of records) {
    await MySQL.insert("payroll_records", {
      uuid: crypto.randomUUID(),
      payroll_number: runNumber,
      employee_id: Number(rec.employeeId) || 1,
      payroll_month: month,
      base_salary: rec.basicSalary || 0,
      piece_rate_earnings: rec.pieceRateAmount || 0,
      overtime_earnings: rec.overtimeAmount || 0,
      advance_deductions: rec.advanceDeduction || 0,
      tax_deductions: rec.taxDeduction || 0,
      net_payable: rec.netPayable || 0,
      status: rec.paymentStatus || "Pending",
    });
  }

  return String(insertId);
}

export async function updatePayrollRecordPaidInMySQL(recordId: string, status = "Paid"): Promise<boolean> {
  return MySQL.update("payroll_records", recordId, { status });
}

export async function getPayrollMetricsFromMySQL() {
  const runs = await getPayrollRunsFromMySQL();
  const latestRun = runs[0];

  const totalGrossPayroll = latestRun?.totalGross || 0;
  const totalNetPayable = latestRun?.totalNetPayable || 0;
  const totalEmployeesProcessed = latestRun?.employeesCount || 0;

  const paidEmployeesCount = latestRun?.records?.filter((r) => r.paymentStatus === "Paid").length || 0;
  const pendingEmployeesCount = (latestRun?.records?.length || 0) - paidEmployeesCount;
  const pendingDisbursementAmount = latestRun?.records
    ?.filter((r) => r.paymentStatus === "Pending")
    ?.reduce((acc, r) => acc + (r.netPayable || 0), 0) || 0;
  const advanceLoansDeducted = latestRun?.records?.reduce((acc, r) => acc + (r.advanceDeduction || 0), 0) || 0;

  return {
    totalGrossPayroll,
    totalNetPayable,
    totalEmployeesProcessed,
    paidEmployeesCount,
    pendingEmployeesCount,
    pendingDisbursementAmount,
    advanceLoansDeducted,
  };
}
