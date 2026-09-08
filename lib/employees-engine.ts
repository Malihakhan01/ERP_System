// lib/employees-engine.ts
// Core domain models, validation, wage engines, and business logic for FactoryOS Employees Module

export type SalaryType = "monthly" | "daily" | "piece_rate";

export type EmploymentStatus = "Active" | "On Leave" | "Resigned" | "Terminated" | "Inactive";

export type EmploymentType = "Permanent" | "Contract" | "Temporary";

export type Department =
  | "Cutting"
  | "Stitching"
  | "Finishing"
  | "Quality Control"
  | "Packing"
  | "Warehouse"
  | "Production Planning"
  | "Merchandising"
  | "Admin";

export type SkillLevel =
  | "Trainee"
  | "Semi-Skilled"
  | "Skilled"
  | "Master Craftsman"
  | "Supervisor / Technician";

export interface PieceRateOperation {
  id: string;
  operationName: string;
  ratePerPiece: number; // In PKR
  standardSmv?: number; // Standard minute value
  targetPcsPerHour?: number;
}

export interface EmployeePersonalInfo {
  fullName: string;
  fatherName?: string;
  cnic?: string;
  phone: string;
  phoneCountryCode?: string;
  phoneNumber?: string;
  fullPhoneNumber?: string;
  whatsappPhone?: string;
  whatsappCountryCode?: string;
  whatsappNumber?: string;
  email?: string;
  address?: string;
  city?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyCountryCode?: string;
  emergencyPhoneNumber?: string;
  emergencyRelation?: string;
}

export interface EmployeeEmploymentInfo {
  joiningDate: string;
  department: string;
  designation: string;
  employmentType: string;
  status: string;
}

export interface SalaryBreakdown {
  basicSalary: number;
  houseRentAllowance: number;
  conveyanceAllowance: number;
  medicalAllowance: number;
  foodOrSpecialAllowance: number;
  overtimeHourlyRate: number;
  eobiDeduction: number;
  taxDeduction: number;
}

export interface EmployeeSalaryInfo {
  salaryType: SalaryType;
  monthlySalary?: number;
  dailyRate?: number;
  pieceRate?: number;
  pieceRateOperations?: PieceRateOperation[];
  breakdown?: SalaryBreakdown;
  bankName?: string;
  accountNumber?: string;
  paymentMode?: "Bank Transfer" | "Cash" | "Cheque";
}

export interface EmployeeFactoryInfo {
  skillLevel?: string;
  assignedLine?: string;
  operation?: string;
  shift?: "Morning" | "Evening" | "Night" | "General" | "";
  experienceYears?: number;
  trainingDate?: string;
  verifiedBy?: string;
  lastEvaluationDate?: string;
}

export type DocumentType =
  | "cnic_front"
  | "cnic_back"
  | "contract"
  | "photo"
  | "medical"
  | "joining_letter";

export interface StoredDocument {
  id: string;
  type: DocumentType;
  title: string;
  fileName: string;
  fileUrl?: string;
  storagePath?: string;
  fileSize: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface EmployeeTimelineEvent {
  id: string;
  type:
    | "created"
    | "updated"
    | "salary_updated"
    | "department_changed"
    | "status_changed"
    | "archived"
    | "note_added"
    | "document_uploaded"
    | "advance_approved"
    | "payroll_disbursed";
  title: string;
  description: string;
  timestamp: string;
  actor?: string;
}

export interface AttendanceDayLog {
  date: string;
  checkIn: string;
  checkOut: string;
  status: "Present" | "Late" | "Absent" | "On Leave" | "Holiday";
  overtimeHours: number;
}

export interface AttendanceSummary {
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  lateDays: number;
  overtimeHours: number;
  attendanceRatePercentage: number;
  dailyLogs: AttendanceDayLog[];
}

export interface AdvanceRecordItem {
  id: string;
  advanceNumber: string;
  requestDate: string;
  amount: number;
  reason: string;
  approvedBy: string;
  deductionMonthlyInstallment: number;
  remainingBalance: number;
  status: "Approved" | "Disbursed" | "Recovered" | "Pending Approval";
}

export interface PayrollHistoryItem {
  id: string;
  monthYear: string; // e.g. "August 2026"
  salaryType: SalaryType;
  baseAmount: number;
  allowances: number;
  overtimeAmount: number;
  pieceEarnings: number;
  advanceDeduction: number;
  otherDeductions: number;
  netPayable: number;
  status: "Paid" | "Pending" | "Processing";
  paymentDate?: string;
  paymentMethod: string;
}

export interface EmployeeRecord {
  id: string;
  employeeNumber: string;
  personalInfo: EmployeePersonalInfo;
  employmentInfo: EmployeeEmploymentInfo;
  salaryInfo: EmployeeSalaryInfo;
  factoryInfo: EmployeeFactoryInfo;
  documents: StoredDocument[];
  attendanceRecords?: AttendanceDayLog[];
  advances?: AdvanceRecordItem[];
  payrollRecords?: PayrollHistoryItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
  timeline?: EmployeeTimelineEvent[];
}

export const EMPLOYEE_STORAGE_KEY = "factoryos_employees";

export const DEPARTMENTS: Department[] = [
  "Cutting",
  "Stitching",
  "Finishing",
  "Quality Control",
  "Packing",
  "Warehouse",
  "Production Planning",
  "Merchandising",
  "Admin",
];

export const EMPLOYMENT_STATUSES: EmploymentStatus[] = [
  "Active",
  "On Leave",
  "Resigned",
  "Terminated",
  "Inactive",
];

export const EMPLOYMENT_TYPES: EmploymentType[] = [
  "Permanent",
  "Contract",
  "Temporary",
];

export const SALARY_TYPES: { label: string; value: SalaryType; desc: string }[] = [
  {
    label: "Monthly Fixed",
    value: "monthly",
    desc: "Fixed monthly salary for permanent staff and supervisors",
  },
  {
    label: "Daily Wage",
    value: "daily",
    desc: "Daily calculated wage based on attendance days (e.g. PKR 1,500/day)",
  },
  {
    label: "Piece Rate",
    value: "piece_rate",
    desc: "Paid per completed unit or operation (e.g. Collar Stitching PKR 12/pc)",
  },
];

export const SKILL_LEVELS: SkillLevel[] = [
  "Trainee",
  "Semi-Skilled",
  "Skilled",
  "Master Craftsman",
  "Supervisor / Technician",
];

export const PRODUCTION_LINES = [
  "Line 1 (T-Shirts & Tops)",
  "Line 2 (Polo & Collar)",
  "Line 3 (Hoodies & Fleece)",
  "Line 4 (Denim & Bottoms)",
  "Line 5 (Kids Wear)",
  "Line 6 (Activewear)",
  "Cutting Section Line A",
  "Finishing & Pressing Line",
  "Packaging & Dispatch Line",
];

export const COMMON_GARMENT_OPERATIONS: { name: string; dept: Department; defaultRate: number }[] = [
  { name: "Collar Stitching & Joining", dept: "Stitching", defaultRate: 14 },
  { name: "Cuff Preparation & Attaching", dept: "Stitching", defaultRate: 12 },
  { name: "Front Placket & Buttonhole", dept: "Stitching", defaultRate: 16 },
  { name: "Sleeve Set & Overlock", dept: "Stitching", defaultRate: 18 },
  { name: "Side Seam & Bottom Hemming", dept: "Stitching", defaultRate: 10 },
  { name: "Pocket Setting & Bar Tack", dept: "Stitching", defaultRate: 15 },
  { name: "Fabric Laying & Pattern Cutting", dept: "Cutting", defaultRate: 8 },
  { name: "Thread Trimming & Cleaning", dept: "Finishing", defaultRate: 5 },
  { name: "Garment Ironing & Steam Press", dept: "Finishing", defaultRate: 9 },
  { name: "Tagging, Folding & Polybag Packing", dept: "Packing", defaultRate: 6 },
  { name: "100% End-Line Quality Inspection", dept: "Quality Control", defaultRate: 11 },
];

export const COUNTRY_CODES = [
  { code: "+92", label: "🇵🇰 +92 (PK)", flag: "🇵🇰", country: "Pakistan", placeholder: "300 1234567" },
  { code: "+971", label: "🇦🇪 +971 (UAE)", flag: "🇦🇪", country: "UAE", placeholder: "50 123 4567" },
  { code: "+966", label: "🇸🇦 +966 (KSA)", flag: "🇸🇦", country: "Saudi Arabia", placeholder: "50 123 4567" },
  { code: "+44", label: "🇬🇧 +44 (UK)", flag: "🇬🇧", country: "United Kingdom", placeholder: "7911 123456" },
  { code: "+1", label: "🇺🇸 +1 (US/CA)", flag: "🇺🇸", country: "USA", placeholder: "555 123 4567" },
  { code: "+880", label: "🇧🇩 +880 (BD)", flag: "🇧🇩", country: "Bangladesh", placeholder: "1712 345678" },
];

/**
 * Format CNIC automatically as user types into XXXXX-XXXXXXX-X (13 digits)
 */
export function formatCNIC(val: string): string {
  if (!val) return "";
  const digits = val.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
}

/**
 * Format phone number digits
 */
export function formatPhoneNumber(val: string): string {
  if (!val) return "";
  return val.replace(/[^\d+]/g, "").slice(0, 16);
}

/**
 * Capitalize first letter of each word
 */
export function capitalizeWords(str?: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Generate next sequential Employee ID: EMP-YYYY-NNN
 */
export function generateNextEmployeeNumber(records: EmployeeRecord[], year?: number): string {
  const currentYear = year || new Date().getFullYear();
  const yearPrefix = `EMP-${currentYear}-`;

  let maxNum = 0;
  for (const emp of records) {
    if (emp.employeeNumber && emp.employeeNumber.startsWith(yearPrefix)) {
      const numPart = parseInt(emp.employeeNumber.replace(yearPrefix, ""), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }

  const nextNum = maxNum + 1;
  const formattedNum = String(nextNum).padStart(3, "0");
  return `${yearPrefix}${formattedNum}`;
}

/**
 * Generate internal unique immutable ID
 */
export function generateInternalEmployeeId(): string {
  return `emp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Compute detailed salary breakdown for monthly fixed employees
 */
export function calculateSalaryBreakdown(monthlyGross: number): SalaryBreakdown {
  const gross = Math.max(0, monthlyGross || 0);
  const basic = Math.round(gross * 0.6); // 60% Basic Salary standard
  const houseRent = Math.round(gross * 0.2); // 20% House Rent
  const conveyance = Math.round(gross * 0.1); // 10% Conveyance
  const medical = Math.round(gross * 0.05); // 5% Medical
  const food = Math.max(0, gross - (basic + houseRent + conveyance + medical));
  const otHourly = Math.round(gross / (26 * 8)); // 26 days * 8 hours
  const eobi = gross >= 25000 ? 500 : 300;
  const tax = gross > 100000 ? Math.round((gross - 100000) * 0.05) : 0;

  return {
    basicSalary: basic,
    houseRentAllowance: houseRent,
    conveyanceAllowance: conveyance,
    medicalAllowance: medical,
    foodOrSpecialAllowance: food,
    overtimeHourlyRate: otHourly,
    eobiDeduction: eobi,
    taxDeduction: tax,
  };
}

/**
 * Create a fresh, 100% BLANK employee record structure
 * All documents, attendance, advances, and payroll start completely EMPTY.
 */
export function createBlankEmployeeRecord(existingRecords: EmployeeRecord[] = []): EmployeeRecord {
  const now = new Date().toISOString();
  return {
    id: generateInternalEmployeeId(),
    employeeNumber: generateNextEmployeeNumber(existingRecords),
    personalInfo: {
      fullName: "",
      fatherName: "",
      cnic: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      emergencyContact: "",
      emergencyRelation: "",
    },
    employmentInfo: {
      joiningDate: new Date().toISOString().split("T")[0],
      department: "",
      designation: "",
      employmentType: "",
      status: "Active",
    },
    salaryInfo: {
      salaryType: "monthly",
      monthlySalary: undefined,
      dailyRate: undefined,
      pieceRate: undefined,
      pieceRateOperations: [],
      breakdown: undefined,
      bankName: "",
      accountNumber: "",
      paymentMode: "Bank Transfer",
    },
    factoryInfo: {
      skillLevel: "",
      assignedLine: "",
      operation: "",
      shift: "",
      experienceYears: undefined,
      trainingDate: "",
      verifiedBy: "",
      lastEvaluationDate: "",
    },
    documents: [], // 100% EMPTY array - zero fake uploads
    attendanceRecords: [], // 100% EMPTY array - zero fake attendance
    advances: [], // 100% EMPTY array - zero fake loans
    payrollRecords: [], // 100% EMPTY array - zero fake payroll
    notes: "",
    createdAt: now,
    updatedAt: now,
    isArchived: false,
    timeline: [],
  };
}

/**
 * Validation rules with strict CNIC and flexible Pakistan Phone verification
 */
export interface ValidationError {
  field: string;
  message: string;
}

export function validateEmployeeRecord(
  record: Partial<EmployeeRecord>,
  existingRecords: EmployeeRecord[] = []
): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Required: Full Name
  if (!record.personalInfo?.fullName || record.personalInfo.fullName.trim().length === 0) {
    errors.push({ field: "fullName", message: "Employee full name is required" });
  } else if (record.personalInfo.fullName.trim().length < 2) {
    errors.push({ field: "fullName", message: "Full name must be at least 2 characters" });
  }

  // 2. Phone Validation
  if (!record.personalInfo?.phone || record.personalInfo.phone.trim().length === 0) {
    errors.push({ field: "phone", message: "Contact phone number is required" });
  } else {
    const rawPhone = record.personalInfo.phone.trim();
    const cleanPhone = rawPhone.replace(/[\s-]/g, "");
    const isPakMobile = /^(?:03\d{9}|(?:\+92|92)3\d{9}|3\d{9})$/.test(cleanPhone);
    const isIntlPhone = /^\+?[0-9]{7,15}$/.test(cleanPhone);

    if (!isPakMobile && !isIntlPhone) {
      errors.push({
        field: "phone",
        message: "Invalid phone format. Enter Pakistani mobile (e.g. 03001234567 or +923001234567).",
      });
    }
  }

  // 3. Strict CNIC Validation (13 digits)
  if (record.personalInfo?.cnic && record.personalInfo.cnic.trim().length > 0) {
    const rawCnic = record.personalInfo.cnic.trim();
    const cleanCnic = rawCnic.replace(/\D/g, "");

    if (cleanCnic.length !== 13) {
      errors.push({
        field: "cnic",
        message: "Invalid CNIC. Must be exactly 13 digits (e.g. 35202-1234567-1).",
      });
    }

    const duplicate = existingRecords.find(
      (e) =>
        e.id !== record.id &&
        !e.isArchived &&
        e.personalInfo?.cnic &&
        e.personalInfo.cnic.replace(/\D/g, "") === cleanCnic
    );
    if (duplicate) {
      errors.push({
        field: "cnic",
        message: `CNIC is already registered to employee ${duplicate.employeeNumber} (${duplicate.personalInfo.fullName})`,
      });
    }
  }

  // 4. Required: Department
  if (!record.employmentInfo?.department || record.employmentInfo.department.trim().length === 0) {
    errors.push({ field: "department", message: "Please select a department" });
  }

  // 5. Required: Designation
  if (!record.employmentInfo?.designation || record.employmentInfo.designation.trim().length === 0) {
    errors.push({ field: "designation", message: "Designation is required" });
  }

  // 6. Required: Joining Date
  if (!record.employmentInfo?.joiningDate || record.employmentInfo.joiningDate.trim().length === 0) {
    errors.push({ field: "joiningDate", message: "Joining date is required" });
  }

  // 7. Salary Validation
  const salaryType = record.salaryInfo?.salaryType || "monthly";
  if (salaryType === "monthly") {
    if (
      record.salaryInfo?.monthlySalary !== undefined &&
      record.salaryInfo?.monthlySalary !== null &&
      String(record.salaryInfo.monthlySalary).trim() !== ""
    ) {
      const salary = Number(record.salaryInfo.monthlySalary);
      if (isNaN(salary) || salary < 0) {
        errors.push({ field: "monthlySalary", message: "Monthly salary must be a positive number" });
      }
    }
  } else if (salaryType === "daily") {
    if (
      record.salaryInfo?.dailyRate !== undefined &&
      record.salaryInfo?.dailyRate !== null &&
      String(record.salaryInfo.dailyRate).trim() !== ""
    ) {
      const rate = Number(record.salaryInfo.dailyRate);
      if (isNaN(rate) || rate < 0) {
        errors.push({ field: "dailyRate", message: "Daily rate must be a positive number" });
      }
    }
  } else if (salaryType === "piece_rate") {
    const rate = Number(record.salaryInfo?.pieceRate);
    if (rate !== undefined && (isNaN(rate) || rate < 0)) {
      errors.push({ field: "pieceRate", message: "Base piece rate cannot be negative" });
    }
    if (record.salaryInfo?.pieceRateOperations) {
      for (const op of record.salaryInfo.pieceRateOperations) {
        if (op.ratePerPiece < 0) {
          errors.push({
            field: "pieceRateOperations",
            message: `Rate for operation "${op.operationName}" cannot be negative`,
          });
          break;
        }
      }
    }
  }

  return errors;
}

/**
 * Duplicate an employee record cleanly
 */
export function duplicateEmployeeRecord(
  source: EmployeeRecord,
  existingRecords: EmployeeRecord[]
): EmployeeRecord {
  const now = new Date().toISOString();
  const newEmpNumber = generateNextEmployeeNumber(existingRecords);
  const newInternalId = generateInternalEmployeeId();

  return {
    ...source,
    id: newInternalId,
    employeeNumber: newEmpNumber,
    personalInfo: {
      ...source.personalInfo,
      fullName: `${source.personalInfo.fullName} (Copy)`,
      cnic: "",
    },
    employmentInfo: {
      ...source.employmentInfo,
      status: "Active",
      joiningDate: new Date().toISOString().split("T")[0],
    },
    salaryInfo: {
      ...source.salaryInfo,
      pieceRateOperations: source.salaryInfo.pieceRateOperations
        ? source.salaryInfo.pieceRateOperations.map((op) => ({
            ...op,
            id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          }))
        : [],
    },
    factoryInfo: {
      ...source.factoryInfo,
    },
    documents: [],
    attendanceRecords: [],
    advances: [],
    payrollRecords: [],
    notes: `Duplicated from ${source.employeeNumber}`,
    createdAt: now,
    updatedAt: now,
    isArchived: false,
    timeline: [
      {
        id: `tl_${Date.now()}_1`,
        type: "created",
        title: "Employee Profile Created (Duplicate)",
        description: `Profile duplicated from template ${source.employeeNumber} with new ID ${newEmpNumber}`,
        timestamp: now,
      },
    ],
  };
}

/**
 * Safety check before hard-deletion
 */
export function canHardDeleteEmployee(
  employee: EmployeeRecord,
  hasLinkedHistory = false
): { canDelete: boolean; reason?: string } {
  if (hasLinkedHistory || (employee.documents && employee.documents.length > 0)) {
    return {
      canDelete: false,
      reason: "Employee has recorded documents or linked history. Archive instead to preserve audit logs.",
    };
  }
  return { canDelete: true };
}

/**
 * Archive employee record safely
 */
export function archiveEmployeeRecord(employee: EmployeeRecord): EmployeeRecord {
  const now = new Date().toISOString();
  const updatedTimeline = [
    ...(employee.timeline || []),
    {
      id: `tl_${Date.now()}`,
      type: "archived" as const,
      title: "Employee Archived",
      description: "Employee status set to Inactive and archived. Historic records preserved.",
      timestamp: now,
    },
  ];

  return {
    ...employee,
    isArchived: true,
    employmentInfo: {
      ...employee.employmentInfo,
      status: "Inactive",
    },
    updatedAt: now,
    timeline: updatedTimeline,
  };
}

/**
 * Append timeline event
 */
export function appendTimelineEvent(
  employee: EmployeeRecord,
  type: EmployeeTimelineEvent["type"],
  title: string,
  description: string
): EmployeeRecord {
  const now = new Date().toISOString();
  const existing = employee.timeline || [];

  const lastEvent = existing[existing.length - 1];
  if (
    lastEvent &&
    lastEvent.title === title &&
    lastEvent.type === type &&
    Math.abs(new Date(now).getTime() - new Date(lastEvent.timestamp).getTime()) < 5000
  ) {
    return employee;
  }

  const newEvent: EmployeeTimelineEvent = {
    id: `tl_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    type,
    title,
    description,
    timestamp: now,
  };

  return {
    ...employee,
    updatedAt: now,
    timeline: [...existing, newEvent],
  };
}

/**
 * Compute Dynamic KPIs
 */
export interface EmployeeKpiMetrics {
  totalEmployees: number;
  activeEmployees: number;
  factoryWorkers: number;
  officeStaff: number;
  monthlyPayrollEstimate: number;
  onLeaveCount: number;
  monthlyFixedCount: number;
  dailyWageCount: number;
  pieceRateCount: number;
}

export function computeEmployeeMetrics(employees: EmployeeRecord[]): EmployeeKpiMetrics {
  const nonArchived = employees.filter((e) => !e.isArchived);

  let activeCount = 0;
  let factoryCount = 0;
  let officeCount = 0;
  let onLeaveCount = 0;
  let monthlyCount = 0;
  let dailyCount = 0;
  let pieceCount = 0;
  let totalPayrollEstimate = 0;

  for (const emp of nonArchived) {
    const status = emp.employmentInfo.status;
    const dept = emp.employmentInfo.department;
    const salaryType = emp.salaryInfo.salaryType;

    if (status === "Active") activeCount++;
    if (status === "On Leave") onLeaveCount++;

    if (
      dept === "Cutting" ||
      dept === "Stitching" ||
      dept === "Finishing" ||
      dept === "Quality Control" ||
      dept === "Packing" ||
      dept === "Warehouse"
    ) {
      factoryCount++;
    } else if (
      dept === "Production Planning" ||
      dept === "Merchandising" ||
      dept === "Admin"
    ) {
      officeCount++;
    } else {
      if (
        emp.employmentInfo.designation?.toLowerCase().includes("operator") ||
        emp.employmentInfo.designation?.toLowerCase().includes("helper") ||
        emp.employmentInfo.designation?.toLowerCase().includes("tailor")
      ) {
        factoryCount++;
      } else {
        officeCount++;
      }
    }

    if (salaryType === "monthly") {
      monthlyCount++;
      totalPayrollEstimate += emp.salaryInfo.monthlySalary || 0;
    } else if (salaryType === "daily") {
      dailyCount++;
      const rate = emp.salaryInfo.dailyRate || 0;
      totalPayrollEstimate += rate * 26;
    } else if (salaryType === "piece_rate") {
      pieceCount++;
      const avgRate =
        emp.salaryInfo.pieceRate ||
        (emp.salaryInfo.pieceRateOperations && emp.salaryInfo.pieceRateOperations.length > 0
          ? emp.salaryInfo.pieceRateOperations.reduce((acc, curr) => acc + curr.ratePerPiece, 0) /
            emp.salaryInfo.pieceRateOperations.length
          : 15);
      totalPayrollEstimate += avgRate * 2000;
    }
  }

  return {
    totalEmployees: nonArchived.length,
    activeEmployees: activeCount,
    factoryWorkers: factoryCount,
    officeStaff: officeCount,
    monthlyPayrollEstimate: Math.round(totalPayrollEstimate),
    onLeaveCount,
    monthlyFixedCount: monthlyCount,
    dailyWageCount: dailyCount,
    pieceRateCount: pieceCount,
  };
}

/**
 * Format Currency (PKR)
 */
export function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString("en-PK")}`;
}

/**
 * Attendance Summary Calculator (Uses real logs if present, else empty/zero)
 */
export function getEmployeeAttendanceSummary(emp: EmployeeRecord): AttendanceSummary {
  const logs = emp.attendanceRecords || [];
  if (logs.length === 0) {
    return {
      totalWorkingDays: 0,
      presentDays: 0,
      absentDays: 0,
      leaveDays: 0,
      lateDays: 0,
      overtimeHours: 0,
      attendanceRatePercentage: 0,
      dailyLogs: [],
    };
  }

  let present = 0;
  let absent = 0;
  let leave = 0;
  let late = 0;
  let ot = 0;

  for (const log of logs) {
    if (log.status === "Present") present++;
    if (log.status === "Late") {
      present++;
      late++;
    }
    if (log.status === "Absent") absent++;
    if (log.status === "On Leave") leave++;
    ot += log.overtimeHours || 0;
  }

  const total = logs.length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  return {
    totalWorkingDays: total,
    presentDays: present,
    absentDays: absent,
    leaveDays: leave,
    lateDays: late,
    overtimeHours: ot,
    attendanceRatePercentage: rate,
    dailyLogs: logs,
  };
}
