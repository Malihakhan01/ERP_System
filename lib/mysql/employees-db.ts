/**
 * FactoryOS Garment ERP — Workforce & HR MySQL 8 Repository
 * Connects /employees with live MySQL `employees` table.
 */

import { executeQuery, MySQL } from "./db";
import type { EmployeeRecord, Department, EmploymentStatus, EmploymentType, SalaryType } from "@/lib/employees-engine";

export async function getEmployeesFromMySQL(): Promise<EmployeeRecord[]> {
  const rows = await executeQuery<any>(
    "SELECT * FROM `employees` WHERE `is_archived` = 0 ORDER BY `created_at` DESC"
  );

  return rows.map((r) => {
    return {
      id: String(r.id),
      employeeNumber: r.employee_number || `EMP-2026-${String(r.id).padStart(3, "0")}`,
      personalInfo: {
        fullName: r.full_name,
        fatherName: r.father_name || undefined,
        cnic: r.cnic || "",
        phone: r.phone || "",
        email: r.email || undefined,
        currentAddress: "Sialkot / Karachi Garment Zone",
        dateOfBirth: "1995-05-15",
        gender: "Male",
        maritalStatus: "Married",
      },
      employmentInfo: {
        department: (r.department || "Stitching") as Department,
        designation: r.designation || "Overlock Sewing Specialist",
        joiningDate: r.joining_date ? new Date(r.joining_date).toISOString().split("T")[0] : "2024-01-15",
        employmentType: (r.employment_type || "Permanent") as EmploymentType,
        status: (r.status || "Active") as EmploymentStatus,
      },
      salaryInfo: {
        salaryType: (r.salary_type === "piece_rate" || r.salary_type === "Piece-Rate" ? "piece_rate" : r.salary_type === "daily" ? "daily" : "monthly") as SalaryType,
        monthlySalary: Number(r.monthly_salary) || 35000,
        dailyRate: Number(r.daily_rate) || 1400,
        pieceRate: Number(r.piece_rate) || 15,
        paymentMode: "Bank Transfer",
      },
      factoryInfo: {
        skillLevel: r.skill_level || "Semi-Skilled",
        assignedLine: r.assigned_line || "Line 1 - Hoodies & Sweatshirts",
        operation: "Overlock Stitching",
        shift: (r.shift || "Morning") as any,
        experienceYears: 5,
      },
      documents: [],
      attendanceRecords: [],
      advances: [],
      payrollRecords: [],
      timeline: [
        {
          id: `evt_emp_${r.id}`,
          title: "Workforce Profile Registered",
          description: `Worker ${r.full_name} enrolled in ${r.department}.`,
          timestamp: new Date(r.created_at || Date.now()).toISOString().replace("T", " ").substring(0, 19),
          actor: "HR Manager",
          type: "created",
        },
      ],
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || new Date().toISOString(),
      isArchived: Boolean(r.is_archived),
    };
  });
}

export async function getEmployeeByIdFromMySQL(id: string): Promise<EmployeeRecord | null> {
  const rows = await executeQuery<any>("SELECT * FROM `employees` WHERE `id` = ? OR `employee_number` = ?", [id, id]);
  if (!rows || rows.length === 0) return null;
  const employees = await getEmployeesFromMySQL();
  return employees.find((e) => e.id === String(rows[0].id)) || null;
}

export async function createEmployeeInMySQL(data: any): Promise<string> {
  const maxRows = await executeQuery<any>("SELECT COALESCE(MAX(id), 0) as max_id FROM `employees`");
  const nextNum = (maxRows[0]?.max_id || 0) + 1;
  const empNum = data.employeeNumber || `EMP-2026-${String(nextNum).padStart(3, "0")}`;

  const fullName = data.personalInfo?.fullName || data.fullName || "New Employee";
  const fatherName = data.personalInfo?.fatherName || data.fatherName || null;
  const cnic = data.personalInfo?.cnic || data.cnic || `34101-${String(Date.now()).slice(-7)}-1`;
  const phone = data.personalInfo?.phone || data.phone || "+92 300 1234567";
  const email = data.personalInfo?.email || data.email || null;
  const joiningDate = data.employmentInfo?.joiningDate || data.joiningDate || new Date().toISOString().split("T")[0];
  const department = data.employmentInfo?.department || data.department || "Stitching";
  const designation = data.employmentInfo?.designation || data.designation || "Sewing Specialist";
  const employmentType = data.employmentInfo?.employmentType || data.employmentType || "Permanent";
  const status = data.employmentInfo?.status || data.status || "Active";
  const salaryType = data.salaryInfo?.salaryType || data.salaryType || "Monthly";
  const monthlySalary = Number(data.salaryInfo?.monthlySalary ?? data.monthlySalary) || 35000;
  const dailyRate = Number(data.salaryInfo?.dailyRate ?? data.dailyRate) || 1400;
  const pieceRate = Number(data.salaryInfo?.pieceRate ?? data.pieceRate) || 15;
  const assignedLine = data.factoryInfo?.assignedLine || data.assignedLine || "Line 1 - Hoodies & Sweatshirts";
  const skillLevel = data.factoryInfo?.skillLevel || data.skillLevel || "Semi-Skilled";
  const shift = data.factoryInfo?.shift || data.shift || "Morning";

  const insertId = await MySQL.insert("employees", {
    uuid: crypto.randomUUID(),
    employee_number: empNum,
    full_name: fullName,
    father_name: fatherName,
    cnic: cnic,
    phone: phone,
    email: email,
    joining_date: joiningDate,
    department: department,
    designation: designation,
    employment_type: employmentType,
    status: status,
    salary_type: salaryType,
    monthly_salary: monthlySalary,
    daily_rate: dailyRate,
    piece_rate: pieceRate,
    assigned_line: assignedLine,
    skill_level: skillLevel,
    shift: shift,
    is_archived: 0,
  });

  return String(insertId);
}

export async function updateEmployeeInMySQL(id: string, data: Partial<EmployeeRecord>): Promise<boolean> {
  const payload: Record<string, any> = {};

  if (data.personalInfo?.fullName) payload.full_name = data.personalInfo.fullName;
  if (data.personalInfo?.fatherName !== undefined) payload.father_name = data.personalInfo.fatherName;
  if (data.personalInfo?.cnic) payload.cnic = data.personalInfo.cnic;
  if (data.personalInfo?.phone) payload.phone = data.personalInfo.phone;
  if (data.personalInfo?.email !== undefined) payload.email = data.personalInfo.email;
  if (data.employmentInfo?.department) payload.department = data.employmentInfo.department;
  if (data.employmentInfo?.designation) payload.designation = data.employmentInfo.designation;
  if (data.employmentInfo?.status) payload.status = data.employmentInfo.status;
  if (data.employmentInfo?.employmentType) payload.employment_type = data.employmentInfo.employmentType;
  if (data.factoryInfo?.assignedLine) payload.assigned_line = data.factoryInfo.assignedLine;
  if (data.factoryInfo?.skillLevel) payload.skill_level = data.factoryInfo.skillLevel;
  if (data.salaryInfo?.salaryType) payload.salary_type = data.salaryInfo.salaryType;
  if (data.salaryInfo?.monthlySalary !== undefined) payload.monthly_salary = data.salaryInfo.monthlySalary;
  if (data.salaryInfo?.dailyRate !== undefined) payload.daily_rate = data.salaryInfo.dailyRate;
  if (data.salaryInfo?.pieceRate !== undefined) payload.piece_rate = data.salaryInfo.pieceRate;
  if (data.isArchived !== undefined) payload.is_archived = data.isArchived ? 1 : 0;

  return MySQL.update("employees", id, payload);
}

export async function deleteEmployeeInMySQL(id: string): Promise<boolean> {
  return MySQL.delete("employees", id, true);
}

export async function getEmployeeMetricsFromMySQL() {
  const employees = await getEmployeesFromMySQL();
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.employmentInfo.status === "Active").length;
  const factoryWorkers = employees.filter((e) =>
    e.employmentInfo.department.includes("Stitching") ||
    e.employmentInfo.department.includes("Cutting") ||
    e.employmentInfo.department.includes("Finishing") ||
    e.employmentInfo.department.includes("Quality Control") ||
    e.employmentInfo.department.includes("Packing")
  ).length;
  const officeStaff = employees.filter((e) =>
    e.employmentInfo.department.includes("Admin") ||
    e.employmentInfo.department.includes("Planning") ||
    e.employmentInfo.department.includes("Merchandising")
  ).length;

  const monthlyPayrollEstimate = employees.reduce((acc, e) => {
    if (e.employmentInfo.status !== "Active") return acc;
    if (e.salaryInfo.monthlySalary) return acc + e.salaryInfo.monthlySalary;
    if (e.salaryInfo.dailyRate) return acc + e.salaryInfo.dailyRate * 26;
    return acc + 30000;
  }, 0);

  return {
    totalEmployees,
    activeEmployees,
    factoryWorkers,
    officeStaff,
    monthlyPayrollEstimate,
  };
}
