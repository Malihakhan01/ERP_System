"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { FormField } from "@/components/forms/FormField";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { useToast } from "@/components/ui/Toast";
import {
  ArrowLeft,
  UserCheck,
  Camera,
  CheckCircle2,
  AlertCircle,
  Users,
  Briefcase,
  DollarSign,
  FileText,
  Save,
} from "lucide-react";
import {
  EmployeeRecord,
  SalaryType,
  StoredDocument,
  createBlankEmployeeRecord,
  capitalizeWords,
  formatCNIC,
  validateEmployeeRecord,
  calculateSalaryBreakdown,
  appendTimelineEvent,
  DEPARTMENTS,
  EMPLOYMENT_TYPES,
  PRODUCTION_LINES,
  SALARY_TYPES,
  EMPLOYEE_STORAGE_KEY,
} from "@/lib/employees-engine";
import {
  createEmployeeInDB,
  updateEmployeeInDB,
  getEmployeesFromDB,
} from "@/lib/services/employees-service";

const STATUS_BADGE_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "danger" | "default" }> = {
  Active: { label: "Active Worker", variant: "success" },
  Probation: { label: "Probation", variant: "warning" },
  "On Leave": { label: "On Leave", variant: "warning" },
  Suspended: { label: "Suspended", variant: "danger" },
  Terminated: { label: "Terminated", variant: "danger" },
  Resigned: { label: "Resigned", variant: "default" },
};

function formatBytes(bytes: number, decimals = 1): string {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export interface EmployeeFormProps {
  mode: "create" | "edit";
  initialData?: EmployeeRecord | null;
  existingEmployees?: EmployeeRecord[];
  onSave?: (savedEmployee: EmployeeRecord) => void;
  onCancel?: () => void;
}

export function EmployeeForm({
  mode,
  initialData,
  existingEmployees = [],
  onSave,
  onCancel,
}: EmployeeFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [allEmployees, setAllEmployees] = React.useState<EmployeeRecord[]>(existingEmployees);

  // Load existing employees for unique checks if not passed
  React.useEffect(() => {
    if (allEmployees.length === 0) {
      try {
        const stored = localStorage.getItem(EMPLOYEE_STORAGE_KEY);
        if (stored) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setAllEmployees(JSON.parse(stored));
        }
      } catch (e) {
        console.error(e);
      }
      getEmployeesFromDB().then((emps) => {
        if (emps && emps.length > 0) setAllEmployees(emps);
      }).catch(console.error);
    }
  }, [allEmployees.length]);

  // Form State
  const [formData, setFormData] = React.useState<EmployeeRecord>(() => {
    if (mode === "edit" && initialData) {
      return JSON.parse(JSON.stringify(initialData));
    }
    return createBlankEmployeeRecord(existingEmployees);
  });

  // Country Code State
  const [phoneCountryCode, setPhoneCountryCode] = React.useState(
    formData.personalInfo?.phoneCountryCode || "+92"
  );
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const [successBanner, setSuccessBanner] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // In create mode: fetch the real next sequential employee number from MySQL database
  React.useEffect(() => {
    if (mode === "create") {
      fetch("/api/employees/next-id")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.nextEmployeeNumber) {
            setFormData((prev) => ({
              ...prev,
              employeeNumber: data.nextEmployeeNumber,
            }));
          }
        })
        .catch((err) => {
          console.error("Failed to fetch next employee ID from MySQL:", err);
        });
    }
  }, [mode]);

  // Document attachments
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(
    formData.documents?.find((d) => d.type === "photo")?.fileUrl || null
  );
  const [cnicFrontFile, setCnicFrontFile] = React.useState<File | null>(null);
  const [cnicBackFile, setCnicBackFile] = React.useState<File | null>(null);
  const [contractFile, setContractFile] = React.useState<File | null>(null);

  // Sync with initialData if loaded asynchronously in edit mode
  React.useEffect(() => {
    if (mode === "edit" && initialData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(JSON.parse(JSON.stringify(initialData)));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhoneCountryCode(initialData.personalInfo?.phoneCountryCode || "+92");
      const photoDoc = initialData.documents?.find((d) => d.type === "photo");
      if (photoDoc?.fileUrl) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPhotoPreview(photoDoc.fileUrl);
      }
    }
  }, [mode, initialData]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push("/employees");
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setFormErrors({});

    const rawPhone = formData.personalInfo.phone.trim();
    const rawDigits = formData.personalInfo.phoneNumber?.trim();
    const formattedPhone = rawPhone
      ? rawPhone.startsWith("+") || rawPhone.startsWith("00")
        ? rawPhone
        : `${phoneCountryCode} ${rawPhone}`
      : "";

    const joiningDate = formData.employmentInfo.joiningDate || new Date().toISOString().split("T")[0];

    const candidateRecord: EmployeeRecord = {
      ...formData,
      personalInfo: {
        ...formData.personalInfo,
        fullName: capitalizeWords(formData.personalInfo.fullName),
        fatherName: formData.personalInfo.fatherName ? capitalizeWords(formData.personalInfo.fatherName) : "",
        cnic: formatCNIC(formData.personalInfo.cnic || ""),
        phone: formattedPhone,
        phoneCountryCode,
        phoneNumber: rawDigits || rawPhone,
        fullPhoneNumber: formattedPhone,
      },
      employmentInfo: {
        ...formData.employmentInfo,
        joiningDate,
        designation: capitalizeWords(formData.employmentInfo.designation),
      },
    };

    const errors = validateEmployeeRecord(
      candidateRecord,
      allEmployees.filter((e) => (mode === "edit" ? e.id !== candidateRecord.id : true))
    );

    if (errors.length > 0) {
      const errMap: Record<string, string> = {};
      errors.forEach((e) => (errMap[e.field] = e.message));
      setFormErrors(errMap);
      setIsSubmitting(false);
      toast({
        type: "error",
        message: "Required Information Missing",
        description: errors[0].message,
      });
      return;
    }

    let breakdown = candidateRecord.salaryInfo.breakdown;
    if (candidateRecord.salaryInfo.salaryType === "monthly" && candidateRecord.salaryInfo.monthlySalary) {
      breakdown = calculateSalaryBreakdown(candidateRecord.salaryInfo.monthlySalary);
    }

    // Attach documents
    const initialDocs: StoredDocument[] = [...(candidateRecord.documents || [])];
    if (photoPreview && photoFile) {
      initialDocs.push({
        id: `doc_${Date.now()}_0`,
        type: "photo",
        title: "Employee Photo",
        fileName: photoFile.name,
        fileUrl: photoPreview,
        fileSize: formatBytes(photoFile.size),
        uploadedAt: new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }),
        uploadedBy: "HR Admin",
      });
    }
    if (cnicFrontFile) {
      initialDocs.push({
        id: `doc_${Date.now()}_1`,
        type: "cnic_front",
        title: "CNIC Copy Front",
        fileName: cnicFrontFile.name,
        fileSize: formatBytes(cnicFrontFile.size),
        uploadedAt: new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }),
        uploadedBy: "HR Admin",
      });
    }
    if (cnicBackFile) {
      initialDocs.push({
        id: `doc_${Date.now()}_2`,
        type: "cnic_back",
        title: "CNIC Copy Back",
        fileName: cnicBackFile.name,
        fileSize: formatBytes(cnicBackFile.size),
        uploadedAt: new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }),
        uploadedBy: "HR Admin",
      });
    }
    if (contractFile) {
      initialDocs.push({
        id: `doc_${Date.now()}_3`,
        type: "contract",
        title: "Employment Contract",
        fileName: contractFile.name,
        fileSize: formatBytes(contractFile.size),
        uploadedAt: new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }),
        uploadedBy: "HR Admin",
      });
    }

    if (mode === "create") {
      const createdRecord: EmployeeRecord = {
        ...candidateRecord,
        salaryInfo: {
          ...candidateRecord.salaryInfo,
          breakdown,
        },
        documents: initialDocs,
        attendanceRecords: [],
        advances: [],
        payrollRecords: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timeline: [
          {
            id: `tl_${Date.now()}`,
            type: "created",
            title: "Employee Profile Created",
            description: `New employee onboarded as ${candidateRecord.employmentInfo.designation} in ${candidateRecord.employmentInfo.department} department.`,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const saveResult = await createEmployeeInDB(createdRecord);
      if (!saveResult.success) {
        setIsSubmitting(false);
        const errMsg = saveResult.message || "Failed to register employee in database.";
        setFormErrors({ general: errMsg });
        toast({
          type: "error",
          message: "Employee Registration Failed",
          description: errMsg,
        });
        return;
      }

      const finalRecord = saveResult.data || createdRecord;
      const updatedList = [finalRecord, ...allEmployees.filter((e) => e.id !== finalRecord.id)];
      try {
        localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(updatedList));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.error(e);
      }

      setSuccessBanner(`${finalRecord.employeeNumber} — ${finalRecord.personalInfo.fullName} registered successfully.`);
      toast({
        type: "success",
        message: "Employee Registered",
        description: `${finalRecord.employeeNumber} — ${finalRecord.personalInfo.fullName} registered successfully.`,
      });

      setTimeout(() => {
        setIsSubmitting(false);
        if (onSave) {
          onSave(finalRecord);
        } else {
          router.push("/employees");
        }
      }, 500);
      return;
    } else {
      let updatedRecord: EmployeeRecord = {
        ...candidateRecord,
        salaryInfo: {
          ...candidateRecord.salaryInfo,
          breakdown,
        },
        documents: initialDocs,
        updatedAt: new Date().toISOString(),
      };

      if (initialData) {
        if (initialData.employmentInfo.department !== updatedRecord.employmentInfo.department) {
          updatedRecord = appendTimelineEvent(
            updatedRecord,
            "department_changed",
            "Department Reassigned",
            `Department updated from ${initialData.employmentInfo.department} to ${updatedRecord.employmentInfo.department}`
          );
        }
        if (initialData.employmentInfo.status !== updatedRecord.employmentInfo.status) {
          updatedRecord = appendTimelineEvent(
            updatedRecord,
            "status_changed",
            "Status Updated",
            `Employment status changed from ${initialData.employmentInfo.status} to ${updatedRecord.employmentInfo.status}`
          );
        }
      }

      updatedRecord = appendTimelineEvent(
        updatedRecord,
        "updated",
        "Employee Profile Updated",
        "Core employee details and profile records updated."
      );

      const saveResult = await updateEmployeeInDB(updatedRecord);
      if (!saveResult.success) {
        setIsSubmitting(false);
        const errMsg = saveResult.message || "Failed to update employee.";
        setFormErrors({ general: errMsg });
        toast({
          type: "error",
          message: "Update Failed",
          description: errMsg,
        });
        return;
      }

      const finalRecord = saveResult.data || updatedRecord;
      const updatedList = allEmployees.map((e) => (e.id === finalRecord.id ? finalRecord : e));
      try {
        localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(updatedList));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.error(e);
      }

      setSuccessBanner(`Employee ${finalRecord.employeeNumber} updated successfully.`);
      toast({
        type: "success",
        message: "Profile Updated",
        description: `Changes to ${finalRecord.employeeNumber} saved successfully.`,
      });

      setTimeout(() => {
        setIsSubmitting(false);
        if (onSave) {
          onSave(finalRecord);
        } else {
          router.push("/employees");
        }
      }, 500);
      return;
    }
  };

  return (
    <div className="space-y-6 min-w-0 w-full p-4 lg:p-6 pb-24 animate-in fade-in-0 duration-200">
      {/* ========================================================= */}
      {/* 1. HEADER ACTION BAR                                      */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleCancel}
            className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Cancel and Back to Directory"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {mode === "create" ? "Onboard New Employee" : `Edit Employee Profile`}
              </h1>
              <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200">
                {formData.employeeNumber}
              </span>
              {mode === "create" ? (
                <Badge variant="default" dot>
                  Draft Registration
                </Badge>
              ) : (
                <Badge
                  variant={STATUS_BADGE_CONFIG[formData.employmentInfo.status]?.variant || "default"}
                  dot
                >
                  {STATUS_BADGE_CONFIG[formData.employmentInfo.status]?.label || formData.employmentInfo.status}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate">
              {mode === "create"
                ? "Factory Workforce Onboarding • Enter employee profile credentials, assignment & salary model"
                : `Managing ${formData.personalInfo.fullName || "worker"} • ${formData.employmentInfo.designation || "Staff"} (${formData.employmentInfo.department || "General"} Dept)`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            leftIcon={mode === "create" ? <UserCheck className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          >
            {mode === "create" ? "Register Employee" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Success Alert Banner */}
      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 flex items-start gap-3 shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-bold text-sm text-emerald-900">Success!</strong>
            <p className="mt-0.5 text-emerald-800 font-medium">{successBanner}</p>
          </div>
        </div>
      )}

      {/* Validation & Server Error Alert Banner */}
      {Object.keys(formErrors).length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-950 flex items-start gap-3 shadow-sm animate-in fade-in duration-200">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-bold text-sm text-rose-900">
              {formErrors.general ? "Action Could Not Be Completed" : "Please correct the following fields before saving:"}
            </strong>
            {formErrors.general && (
              <p className="mt-1 font-semibold text-rose-800 text-xs">
                {formErrors.general}
              </p>
            )}
            {Object.entries(formErrors).filter(([k]) => k !== "general").length > 0 && (
              <ul className="list-disc list-inside mt-1.5 space-y-1 text-rose-800">
                {Object.entries(formErrors)
                  .filter(([k]) => k !== "general")
                  .map(([field, msg]) => (
                    <li key={field}>{msg}</li>
                  ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFormErrors({})}
            className="text-rose-500 hover:text-rose-700 font-bold text-sm ml-2 cursor-pointer"
            title="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* CARD A: PERSONAL INFORMATION                              */}
      {/* ========================================================= */}
      <Card className="p-6 border-slate-200/80 shadow-xs bg-white space-y-6">
        <div className="pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            A. Personal & Identity Information
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Official worker credentials, photo identification, and primary communications.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Photo Upload Box */}
          <div className="w-full lg:w-44 shrink-0 flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl gap-2 text-center">
            <div className="relative h-32 w-32 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 overflow-hidden group hover:border-blue-500 transition-all cursor-pointer shadow-xs">
              {photoPreview ? (
                <img src={photoPreview} alt="Employee Portrait" className="h-full w-full object-cover" />
              ) : (
                <>
                  <Camera className="h-8 w-8 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  <span className="text-[11px] font-semibold text-slate-600 mt-1.5">Upload Photo</span>
                </>
              )}
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handlePhotoChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-700">Worker Portrait</p>
              <p className="text-[10px] text-slate-400">JPG or PNG, max 5MB</p>
            </div>
          </div>

          {/* Personal Info Grid */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
            <FormField label="Full Name *" error={formErrors.fullName}>
              <Input
                placeholder="e.g. Muhammad Bilal"
                value={formData.personalInfo.fullName}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    personalInfo: { ...formData.personalInfo, fullName: e.target.value },
                  });
                  if (formErrors.fullName) {
                    setFormErrors((prev) => {
                      const n = { ...prev };
                      delete n.fullName;
                      return n;
                    });
                  }
                }}
              />
            </FormField>

            <FormField label="Father / Guardian Name">
              <Input
                placeholder="e.g. Abdul Rehman"
                value={formData.personalInfo.fatherName || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    personalInfo: { ...formData.personalInfo, fatherName: e.target.value },
                  })
                }
              />
            </FormField>

            <FormField label="CNIC (National 13-Digit ID)" error={formErrors.cnic} description="Auto-formatted (XXXXX-XXXXXXX-X)">
              <Input
                placeholder="35202-1234567-1"
                maxLength={15}
                value={formData.personalInfo.cnic || ""}
                onChange={(e) => {
                  const formatted = formatCNIC(e.target.value);
                  setFormData({
                    ...formData,
                    personalInfo: { ...formData.personalInfo, cnic: formatted },
                  });
                  if (formErrors.cnic) {
                    setFormErrors((prev) => {
                      const n = { ...prev };
                      delete n.cnic;
                      return n;
                    });
                  }
                }}
              />
            </FormField>

            <div className="sm:col-span-2 lg:col-span-1">
              <FormField label="Mobile Phone Number *" error={formErrors.phone}>
                <PhoneInput
                  value={formData.personalInfo.phone}
                  defaultCountry={phoneCountryCode}
                  error={!!formErrors.phone}
                  onChange={(fullPhone, meta) => {
                    setPhoneCountryCode(meta.countryCode);
                    setFormData({
                      ...formData,
                      personalInfo: {
                        ...formData.personalInfo,
                        phone: fullPhone,
                        phoneCountryCode: meta.countryCode,
                        phoneNumber: meta.number,
                        fullPhoneNumber: fullPhone,
                      },
                    });
                    if (formErrors.phone) {
                      setFormErrors((prev) => {
                        const n = { ...prev };
                        delete n.phone;
                        return n;
                      });
                    }
                  }}
                />
              </FormField>
            </div>

            <div className="sm:col-span-2 lg:col-span-2">
              <FormField label="Residential Address">
                <Input
                  placeholder="Enter residential address, street, and city"
                  value={formData.personalInfo.address || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personalInfo: { ...formData.personalInfo, address: e.target.value },
                    })
                  }
                />
              </FormField>
            </div>
          </div>
        </div>
      </Card>

      {/* ========================================================= */}
      {/* CARD B: EMPLOYMENT SETUP                                  */}
      {/* ========================================================= */}
      <Card className="p-6 border-slate-200/80 shadow-xs bg-white space-y-6">
        <div className="pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            B. Employment & Factory Floor Setup
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Department routing, factory floor line assignment, contract type, and scheduled shifts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <FormField
            label="Employee ID / Number *"
            error={formErrors.employeeNumber}
            description="Auto-generated sequential ID from database. Must be unique."
          >
            <Input
              value={formData.employeeNumber}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  employeeNumber: e.target.value.trim().toUpperCase(),
                });
                if (formErrors.employeeNumber) {
                  setFormErrors((prev) => {
                    const n = { ...prev };
                    delete n.employeeNumber;
                    return n;
                  });
                }
              }}
              placeholder="e.g. EMP-2026-022"
              className="font-mono font-bold uppercase tracking-wider"
            />
          </FormField>

          <FormField label="Department *" error={formErrors.department}>
            <Select
              value={formData.employmentInfo.department}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  employmentInfo: { ...formData.employmentInfo, department: e.target.value },
                });
                if (formErrors.department) {
                  setFormErrors((prev) => {
                    const n = { ...prev };
                    delete n.department;
                    return n;
                  });
                }
              }}
              options={[{ label: "-- Select Department --", value: "" }, ...DEPARTMENTS.map((d) => ({ label: d, value: d }))]}
            />
          </FormField>

          <FormField label="Designation / Role *" error={formErrors.designation}>
            <Input
              placeholder="e.g. Senior Cutting Operator"
              value={formData.employmentInfo.designation}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  employmentInfo: { ...formData.employmentInfo, designation: e.target.value },
                });
                if (formErrors.designation) {
                  setFormErrors((prev) => {
                    const n = { ...prev };
                    delete n.designation;
                    return n;
                  });
                }
              }}
            />
          </FormField>

          <FormField label="Employment Contract Type">
            <Select
              value={formData.employmentInfo.employmentType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  employmentInfo: { ...formData.employmentInfo, employmentType: e.target.value },
                })
              }
              options={[{ label: "-- Select Contract Type --", value: "" }, ...EMPLOYMENT_TYPES.map((t) => ({ label: t, value: t }))]}
            />
          </FormField>

          <FormField label="Joining Date" description="Defaults to today if not specified">
            <Input
              type="date"
              value={formData.employmentInfo.joiningDate}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  employmentInfo: { ...formData.employmentInfo, joiningDate: e.target.value },
                })
              }
            />
          </FormField>

          <FormField label="Assigned Factory Line">
            <Select
              value={formData.factoryInfo.assignedLine || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  factoryInfo: { ...formData.factoryInfo, assignedLine: e.target.value },
                })
              }
              options={[{ label: "-- Select Factory Line --", value: "" }, ...PRODUCTION_LINES.map((l) => ({ label: l, value: l }))]}
            />
          </FormField>

          <FormField label="Work Shift">
            <Select
              value={formData.factoryInfo.shift || "General"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  factoryInfo: { ...formData.factoryInfo, shift: e.target.value as any },
                })
              }
              options={[
                { label: "General Shift (8:00 AM - 5:00 PM)", value: "General" },
                { label: "Morning Shift (6:00 AM - 2:00 PM)", value: "Morning" },
                { label: "Evening Shift (2:00 PM - 10:00 PM)", value: "Evening" },
                { label: "Night Shift (10:00 PM - 6:00 AM)", value: "Night" },
              ]}
            />
          </FormField>

          {mode === "edit" && (
            <FormField label="Employment Status">
              <Select
                value={formData.employmentInfo.status || "Active"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    employmentInfo: { ...formData.employmentInfo, status: e.target.value },
                  })
                }
                options={[
                  { label: "Active Worker", value: "Active" },
                  { label: "Probation", value: "Probation" },
                  { label: "On Leave", value: "On Leave" },
                  { label: "Suspended", value: "Suspended" },
                  { label: "Terminated", value: "Terminated" },
                  { label: "Resigned", value: "Resigned" },
                ]}
              />
            </FormField>
          )}
        </div>
      </Card>

      {/* ========================================================= */}
      {/* CARD C: SALARY CONFIGURATION                              */}
      {/* ========================================================= */}
      <Card className="p-6 border-slate-200/80 shadow-xs bg-white space-y-6">
        <div className="pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            C. Salary & Wage Configuration
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Define the payroll remuneration model, fixed base wages, daily wages, and disbursement method.
          </p>
        </div>

        <div className="space-y-5">
          <FormField label="Wage Model *">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {SALARY_TYPES.map((st) => {
                const isSelected = formData.salaryInfo.salaryType === st.value;
                return (
                  <div
                    key={st.value}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        salaryInfo: { ...formData.salaryInfo, salaryType: st.value },
                      })
                    }
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-50/80 border-blue-600 text-blue-950 shadow-sm ring-2 ring-blue-100"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100/50"
                    }`}
                  >
                    <p className="font-bold text-sm">{st.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{st.desc}</p>
                  </div>
                );
              })}
            </div>
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {formData.salaryInfo.salaryType === "monthly" && (
              <FormField label="Monthly Fixed Gross Salary (PKR) *" error={formErrors.monthlySalary}>
                <Input
                  type="number"
                  placeholder="e.g. 45000"
                  value={formData.salaryInfo.monthlySalary || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      salaryInfo: {
                        ...formData.salaryInfo,
                        monthlySalary: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                />
              </FormField>
            )}

            {formData.salaryInfo.salaryType === "daily" && (
              <FormField label="Daily Wage Rate (PKR / Day) *" error={formErrors.dailyRate}>
                <Input
                  type="number"
                  placeholder="e.g. 1800"
                  value={formData.salaryInfo.dailyRate || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      salaryInfo: {
                        ...formData.salaryInfo,
                        dailyRate: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                />
              </FormField>
            )}

            {formData.salaryInfo.salaryType === "piece_rate" && (
              <FormField label="Base Piece Rate (PKR / Unit)">
                <Input
                  type="number"
                  placeholder="e.g. 15"
                  value={formData.salaryInfo.pieceRate || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      salaryInfo: {
                        ...formData.salaryInfo,
                        pieceRate: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                />
              </FormField>
            )}

            <FormField label="Payment Method">
              <Select
                value={formData.salaryInfo.paymentMode || "Bank Transfer"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    salaryInfo: { ...formData.salaryInfo, paymentMode: e.target.value as any },
                  })
                }
                options={[
                  { label: "Bank Transfer", value: "Bank Transfer" },
                  { label: "Cash Payout Counter", value: "Cash" },
                  { label: "Company Cheque", value: "Cheque" },
                ]}
              />
            </FormField>
          </div>
        </div>
      </Card>

      {/* ========================================================= */}
      {/* CARD D: INITIAL ONBOARDING DOCUMENTS                      */}
      {/* ========================================================= */}
      <Card className="p-6 border-slate-200/80 shadow-xs bg-white space-y-6">
        <div className="pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            D. Documents & Attachments (Optional)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Attach digital scanned copies of national identification or signed contract documents.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* CNIC Front */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">CNIC Copy Front</span>
              {cnicFrontFile && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            </div>
            <p className="text-xs text-slate-500 truncate">
              {cnicFrontFile ? cnicFrontFile.name : "Attach Front Copy (PDF/JPG)"}
            </p>
            <label className="block">
              <span className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg inline-block cursor-pointer transition-colors shadow-2xs">
                {cnicFrontFile ? "Change File" : "Choose Attachment"}
              </span>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg"
                onChange={(e) => setCnicFrontFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </div>

          {/* CNIC Back */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">CNIC Copy Back</span>
              {cnicBackFile && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            </div>
            <p className="text-xs text-slate-500 truncate">
              {cnicBackFile ? cnicBackFile.name : "Attach Back Copy (PDF/JPG)"}
            </p>
            <label className="block">
              <span className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg inline-block cursor-pointer transition-colors shadow-2xs">
                {cnicBackFile ? "Change File" : "Choose Attachment"}
              </span>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg"
                onChange={(e) => setCnicBackFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </div>

          {/* Contract */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Employment Contract</span>
              {contractFile && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            </div>
            <p className="text-xs text-slate-500 truncate">
              {contractFile ? contractFile.name : "Attach Contract (PDF/Doc)"}
            </p>
            <label className="block">
              <span className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg inline-block cursor-pointer transition-colors shadow-2xs">
                {contractFile ? "Change File" : "Choose Attachment"}
              </span>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg"
                onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </Card>

      {/* ========================================================= */}
      {/* BOTTOM STICKY ACTION BAR                                  */}
      {/* ========================================================= */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
          leftIcon={mode === "create" ? <UserCheck className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        >
          {mode === "create" ? "Register Employee" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
