// lib/services/employees-service.ts
// Supabase Database & Storage Service Layer for FactoryOS Workforce
// Full file upload to `employee-docs` bucket + PostgreSQL sync with seamless Local Storage fallback.

import { createClient } from "./client";
import type {
  EmployeeRecord,
  StoredDocument,
  PieceRateOperation,
  DocumentType,
} from "../employees-engine";
import {
  EMPLOYEE_STORAGE_KEY,
  createBlankEmployeeRecord,
} from "../employees-engine";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit
export const ALLOWED_FILE_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
];

/**
 * Check if real Supabase credentials are configured in environment
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  if (url.includes("placeholder") || key.includes("placeholder")) return false;
  return true;
}

/**
 * Format bytes to readable size (e.g. 1.2 MB, 450 KB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Map PostgreSQL row from Supabase to frontend EmployeeRecord domain model
 */
export function mapRowToEmployeeRecord(
  row: any,
  operations: any[] = [],
  documents: any[] = [],
  timeline: any[] = [],
  attendance: any[] = [],
  advances: any[] = [],
  payroll: any[] = []
): EmployeeRecord {
  return {
    id: row.id,
    employeeNumber: row.employee_number,
    personalInfo: {
      fullName: row.full_name || "",
      fatherName: row.father_name || "",
      cnic: row.cnic || "",
      phone: row.phone || (row.phone_country_code ? `${row.phone_country_code} ${row.phone_number}` : ""),
      phoneCountryCode: row.phone_country_code || "+92",
      phoneNumber: row.phone_number || (row.phone ? row.phone.replace(/^(\+\d+|\d{2,3})[\s-]*/, "") : ""),
      fullPhoneNumber: row.full_phone_number || row.phone || "",
      whatsappPhone: row.whatsapp_phone || "",
      whatsappCountryCode: row.whatsapp_country_code || "+92",
      whatsappNumber: row.whatsapp_number || "",
      email: row.email || "",
      address: row.address || "",
      city: row.city || "",
      emergencyContact: row.emergency_contact || row.emergency_contact_phone || "",
      emergencyContactName: row.emergency_contact_name || "",
      emergencyContactPhone: row.emergency_contact_phone || row.emergency_contact || "",
      emergencyCountryCode: row.emergency_country_code || "+92",
      emergencyPhoneNumber: row.emergency_phone_number || "",
      emergencyRelation: row.emergency_relation || "",
    },
    employmentInfo: {
      joiningDate: row.joining_date || new Date().toISOString().split("T")[0],
      department: row.department || "",
      designation: row.designation || "",
      employmentType: row.employment_type || "Permanent",
      status: row.status || "Active",
    },
    salaryInfo: {
      salaryType: row.salary_type || "monthly",
      monthlySalary: row.monthly_salary !== null ? Number(row.monthly_salary) : undefined,
      dailyRate: row.daily_rate !== null ? Number(row.daily_rate) : undefined,
      pieceRate: row.piece_rate !== null ? Number(row.piece_rate) : undefined,
      pieceRateOperations: operations.map((op) => ({
        id: op.id,
        operationName: op.operation_name,
        ratePerPiece: Number(op.rate_per_piece),
        standardSmv: op.standard_smv ? Number(op.standard_smv) : undefined,
        targetPcsPerHour: op.target_pcs_per_hour ? Number(op.target_pcs_per_hour) : undefined,
      })),
      bankName: row.bank_name || "",
      accountNumber: row.account_number || "",
      paymentMode: row.payment_mode || "Bank Transfer",
    },
    factoryInfo: {
      skillLevel: row.skill_level || "",
      assignedLine: row.assigned_line || "",
      operation: row.operation || "",
      shift: row.shift || "",
      experienceYears: row.experience_years ? Number(row.experience_years) : undefined,
      trainingDate: row.training_date || "",
      verifiedBy: row.verified_by || "",
      lastEvaluationDate: row.last_evaluation_date || "",
    },
    documents: documents.map((doc) => ({
      id: doc.id,
      type: doc.document_type,
      title: doc.title,
      fileName: doc.file_name,
      fileUrl: doc.file_url || "",
      storagePath: doc.storage_path || "",
      fileSize: doc.file_size || "1.2 MB",
      uploadedAt: doc.uploaded_at
        ? new Date(doc.uploaded_at).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })
        : "Recent",
      uploadedBy: doc.uploaded_by || "HR Admin",
    })),
    attendanceRecords: attendance.map((a) => ({
      date: a.date,
      checkIn: a.check_in || "08:00 AM",
      checkOut: a.check_out || "05:00 PM",
      status: a.status || "Present",
      overtimeHours: Number(a.overtime_hours || 0),
    })),
    advances: advances.map((adv) => ({
      id: adv.id,
      advanceNumber: adv.advance_number,
      requestDate: adv.request_date,
      amount: Number(adv.amount),
      reason: adv.reason,
      approvedBy: adv.approved_by,
      deductionMonthlyInstallment: Number(adv.deduction_installment),
      remainingBalance: Number(adv.remaining_balance),
      status: adv.status,
    })),
    payrollRecords: payroll.map((p) => ({
      id: p.id,
      monthYear: p.month_year,
      salaryType: p.salary_type,
      baseAmount: Number(p.base_amount),
      allowances: Number(p.allowances),
      overtimeAmount: Number(p.overtime_amount),
      pieceEarnings: Number(p.piece_earnings),
      advanceDeduction: Number(p.advance_deduction),
      otherDeductions: Number(p.other_deductions),
      netPayable: Number(p.net_payable),
      status: p.status,
      paymentDate: p.payment_date,
      paymentMethod: p.payment_method,
    })),
    notes: row.notes || "",
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    isArchived: Boolean(row.is_archived),
    timeline: timeline.map((evt) => ({
      id: evt.id,
      type: evt.event_type,
      title: evt.title,
      description: evt.description,
      timestamp: evt.timestamp,
      actor: evt.actor || "HR Admin",
    })),
  };
}

/**
 * Map frontend EmployeeRecord to Supabase PostgreSQL table columns
 */
export function mapEmployeeRecordToRow(record: EmployeeRecord) {
  return {
    id: record.id.startsWith("emp_") ? undefined : record.id,
    employee_number: record.employeeNumber,
    full_name: record.personalInfo.fullName,
    father_name: record.personalInfo.fatherName || null,
    cnic: record.personalInfo.cnic || null,
    phone: record.personalInfo.phone,
    phone_country_code: record.personalInfo.phoneCountryCode || "+92",
    phone_number: record.personalInfo.phoneNumber || record.personalInfo.phone.replace(/^(\+\d+|\d{2,3})[\s-]*/, ""),
    full_phone_number: record.personalInfo.fullPhoneNumber || record.personalInfo.phone,
    whatsapp_phone: record.personalInfo.whatsappPhone || null,
    whatsapp_country_code: record.personalInfo.whatsappCountryCode || "+92",
    whatsapp_number: record.personalInfo.whatsappNumber || null,
    email: record.personalInfo.email || null,
    address: record.personalInfo.address || null,
    city: record.personalInfo.city || null,
    emergency_contact: record.personalInfo.emergencyContact || record.personalInfo.emergencyContactPhone || null,
    emergency_contact_name: record.personalInfo.emergencyContactName || null,
    emergency_contact_phone: record.personalInfo.emergencyContactPhone || record.personalInfo.emergencyContact || null,
    emergency_country_code: record.personalInfo.emergencyCountryCode || "+92",
    emergency_phone_number: record.personalInfo.emergencyPhoneNumber || null,
    emergency_relation: record.personalInfo.emergencyRelation || null,
    joining_date: record.employmentInfo.joiningDate,
    department: record.employmentInfo.department,
    designation: record.employmentInfo.designation,
    employment_type: record.employmentInfo.employmentType || "Permanent",
    status: record.employmentInfo.status || "Active",
    salary_type: record.salaryInfo.salaryType,
    monthly_salary: record.salaryInfo.monthlySalary ?? null,
    daily_rate: record.salaryInfo.dailyRate ?? null,
    piece_rate: record.salaryInfo.pieceRate ?? null,
    bank_name: record.salaryInfo.bankName || null,
    account_number: record.salaryInfo.accountNumber || null,
    payment_mode: record.salaryInfo.paymentMode || "Bank Transfer",
    skill_level: record.factoryInfo.skillLevel || null,
    assigned_line: record.factoryInfo.assignedLine || null,
    operation: record.factoryInfo.operation || null,
    shift: record.factoryInfo.shift || null,
    experience_years: record.factoryInfo.experienceYears ?? null,
    training_date: record.factoryInfo.trainingDate || null,
    verified_by: record.factoryInfo.verifiedBy || null,
    last_evaluation_date: record.factoryInfo.lastEvaluationDate || null,
    is_archived: record.isArchived ?? false,
    notes: record.notes || null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * FETCH ALL EMPLOYEES
 */
export async function getEmployeesFromSupabase(): Promise<EmployeeRecord[]> {
  try {
    const res = await fetch("/api/employees");
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      setLocalEmployees(json.data);
      return json.data;
    }
  } catch (err) {
    console.error("Failed to fetch employees from MySQL API:", err);
  }
  return getLocalEmployees();
}

/**
 * CREATE NEW EMPLOYEE IN SUPABASE
 */
export async function createEmployeeInSupabase(record: EmployeeRecord): Promise<EmployeeRecord> {
  const currentLocal = getLocalEmployees();
  const filtered = currentLocal.filter((e) => e.id !== record.id && e.employeeNumber !== record.employeeNumber);
  const updatedLocal = [record, ...filtered];
  setLocalEmployees(updatedLocal);

  try {
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    const json = await res.json();
    if (json.success && json.data?.id) {
      record.id = String(json.data.id);
    }
  } catch (err) {
    console.error("MySQL API insert exception:", err);
  }

  return record;
}

/**
 * UPDATE EMPLOYEE IN SUPABASE
 */
export async function updateEmployeeInSupabase(record: EmployeeRecord): Promise<EmployeeRecord> {
  const currentLocal = getLocalEmployees();
  const updatedLocal = currentLocal.map((e) => (e.id === record.id ? record : e));
  setLocalEmployees(updatedLocal);

  try {
    await fetch(`/api/employees/${record.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
  } catch (err) {
    console.error("MySQL API update exception:", err);
  }

  return record;
}

/**
 * REAL FILE UPLOAD WORKFLOW: SUPABASE STORAGE BUCKET `employee-docs`
 * Uploads file to path: {employee_id}/{timestamp}_{clean_filename}
 * Generates secure URL and creates record in `employee_documents` table
 */
export async function uploadEmployeeDocumentFile(
  employeeId: string,
  file: File,
  docType: DocumentType,
  customTitle?: string
): Promise<{ success: boolean; document?: StoredDocument; error?: string }> {
  // 1. Validation
  if (!file) {
    return { success: false, error: "No file selected." };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { success: false, error: `File too large (${formatBytes(file.size)}). Maximum allowed is 10MB.` };
  }

  const cleanName = file.name.toLowerCase();
  const isValidExt = ALLOWED_FILE_EXTENSIONS.some((ext) => cleanName.endsWith(ext));
  if (!isValidExt && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return { success: false, error: "Invalid file type. Only PDF, JPG, and PNG documents are supported." };
  }

  const docLabels: Record<DocumentType, string> = {
    cnic_front: "CNIC Copy (Front)",
    cnic_back: "CNIC Copy (Back)",
    contract: "Employment Contract Agreement",
    photo: "Passport Size Photograph",
    medical: "Medical Fitness Certificate",
    joining_letter: "Appointment / Joining Letter",
  };

  const title = customTitle?.trim() || docLabels[docType] || file.name;
  const fileSizeReadable = formatBytes(file.size);
  const nowReadable = new Date().toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const docId = `doc_${Date.now()}`;

  // 2. Offline / Local Fallback Mode
  if (!isSupabaseConfigured()) {
    let localUrl = "";
    try {
      localUrl = URL.createObjectURL(file);
    } catch {
      localUrl = "";
    }

    const newDoc: StoredDocument = {
      id: docId,
      type: docType,
      title,
      fileName: file.name,
      fileUrl: localUrl,
      storagePath: `${employeeId}/${file.name}`,
      fileSize: fileSizeReadable,
      uploadedAt: nowReadable,
      uploadedBy: "HR Admin",
    };

    // Update Local Storage
    const list = getLocalEmployees();
    const updated = list.map((emp) => {
      if (emp.id === employeeId) {
        const existing = emp.documents || [];
        const nextDocs = [...existing.filter((d) => d.type !== docType), newDoc];
        return { ...emp, documents: nextDocs, updatedAt: new Date().toISOString() };
      }
      return emp;
    });
    setLocalEmployees(updated);

    return { success: true, document: newDoc };
  }

  // 3. Live Supabase Storage & Database Upload
  try {
    const supabase = createClient();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${employeeId}/${Date.now()}_${sanitizedFileName}`;

    // Upload to bucket `employee-docs`
    const { error: uploadError } = await supabase.storage
      .from("employee-docs")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase storage upload failed:", uploadError);
      return { success: false, error: `Storage upload failed: ${uploadError.message}` };
    }

    // Get Public URL
    const { data: urlData } = supabase.storage.from("employee-docs").getPublicUrl(storagePath);
    const fileUrl = urlData?.publicUrl || "";

    // Insert record into `employee_documents`
    const { data: docRecord, error: dbError } = await supabase
      .from("employee_documents")
      .insert({
        employee_id: employeeId,
        document_type: docType,
        title,
        file_name: file.name,
        file_url: fileUrl,
        file_size: fileSizeReadable,
        uploaded_by: "HR Admin",
      })
      .select()
      .single();

    if (dbError) {
      console.error("Supabase document database insert failed:", dbError);
      return { success: false, error: `Database insert failed: ${dbError.message}` };
    }

    // Log timeline
    await supabase.from("employee_timeline").insert({
      employee_id: employeeId,
      event_type: "document_uploaded",
      title: "Document Attached",
      description: `${title} (${file.name}) uploaded to employee records.`,
      actor: "HR Admin",
    });

    const newDoc: StoredDocument = {
      id: docRecord.id || docId,
      type: docType,
      title,
      fileName: file.name,
      fileUrl,
      storagePath,
      fileSize: fileSizeReadable,
      uploadedAt: nowReadable,
      uploadedBy: "HR Admin",
    };

    // Sync local cache
    const list = getLocalEmployees();
    const updated = list.map((emp) => {
      if (emp.id === employeeId) {
        const existing = emp.documents || [];
        const nextDocs = [...existing.filter((d) => d.type !== docType), newDoc];
        return { ...emp, documents: nextDocs, updatedAt: new Date().toISOString() };
      }
      return emp;
    });
    setLocalEmployees(updated);

    return { success: true, document: newDoc };
  } catch (err: any) {
    console.error("Upload exception:", err);
    return { success: false, error: err.message || "Unknown upload error" };
  }
}

/**
 * DELETE DOCUMENT FROM STORAGE & DATABASE
 */
export async function deleteEmployeeDocumentFile(
  employeeId: string,
  documentId: string,
  storagePath?: string
): Promise<{ success: boolean; error?: string }> {
  // Update local storage
  const list = getLocalEmployees();
  const updated = list.map((emp) => {
    if (emp.id === employeeId) {
      const existing = emp.documents || [];
      const nextDocs = existing.filter((d) => d.id !== documentId);
      return { ...emp, documents: nextDocs, updatedAt: new Date().toISOString() };
    }
    return emp;
  });
  setLocalEmployees(updated);

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const supabase = createClient();

    // 1. Delete from storage bucket if path provided
    if (storagePath) {
      await supabase.storage.from("employee-docs").remove([storagePath]);
    }

    // 2. Delete from employee_documents table
    await supabase.from("employee_documents").delete().eq("id", documentId);

    // 3. Log timeline
    await supabase.from("employee_timeline").insert({
      employee_id: employeeId,
      event_type: "updated",
      title: "Document Removed",
      description: `Document was removed from employee records.`,
      actor: "HR Admin",
    });

    return { success: true };
  } catch (err: any) {
    console.error("Failed to delete document from Supabase:", err);
    return { success: false, error: err.message || "Failed to delete document" };
  }
}

/**
 * LOCAL STORAGE CACHE HELPERS
 */
function getLocalEmployees(): EmployeeRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EMPLOYEE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalEmployees(list: EmployeeRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    const seen = new Set<string>();
    const deduped = list.filter((emp) => {
      if (!emp || !emp.id) return false;
      if (seen.has(emp.id)) return false;
      seen.add(emp.id);
      return true;
    });
    localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(deduped));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Failed to write to local employee cache", e);
  }
}
