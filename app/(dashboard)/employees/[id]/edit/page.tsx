"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { EmployeeRecord, EMPLOYEE_STORAGE_KEY } from "@/lib/employees-engine";
import { getEmployeesFromDB } from "@/lib/services/employees-service";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();

  // Support both param names [id] and [employee_id]
  const employeeParam = (params?.id || params?.employee_id) as string;

  const [employee, setEmployee] = React.useState<EmployeeRecord | null>(null);
  const [allEmployees, setAllEmployees] = React.useState<EmployeeRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

  React.useEffect(() => {
    if (!employeeParam) return;

    // 1. Try LocalStorage
    let found: EmployeeRecord | null = null;
    let list: EmployeeRecord[] = [];

    try {
      const stored = localStorage.getItem(EMPLOYEE_STORAGE_KEY);
      if (stored) {
        list = JSON.parse(stored);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAllEmployees(list);
        found = list.find(
          (e) => e.id === employeeParam || e.employeeNumber === employeeParam
        ) || null;
      }
    } catch (e) {
      console.error("Local storage error:", e);
    }

    if (found) {
      setEmployee(found);
      setIsLoading(false);
    }

    // 2. Fetch from Database
    getEmployeesFromDB()
      .then((emps) => {
        if (emps && emps.length > 0) {
          setAllEmployees(emps);
          const fromDb = emps.find(
            (e) => e.id === employeeParam || e.employeeNumber === employeeParam
          );
          if (fromDb) {
            setEmployee(fromDb);
            setNotFound(false);
          } else if (!found) {
            setNotFound(true);
          }
        } else if (!found) {
          setNotFound(true);
        }
      })
      .catch((err) => {
        console.error("Database fetch error:", err);
        if (!found) setNotFound(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [employeeParam]);

  if (isLoading) {
    return (
      <>
        <TopNav title="Edit Employee Profile — FactoryOS ERP" />
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading employee record...</p>
        </div>
      </>
    );
  }

  if (notFound || !employee) {
    return (
      <>
        <TopNav title="Employee Not Found — FactoryOS ERP" />
        <div className="p-6 max-w-xl mx-auto my-12 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Employee Record Not Found</h2>
          <p className="text-xs text-slate-500">
            Could not find an employee with ID: <span className="font-mono font-bold text-slate-700">{employeeParam}</span>.
          </p>
          <Button variant="primary" onClick={() => router.push("/employees")}>
            Back to Employees Directory
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav title={`Edit Profile — ${employee.employeeNumber} (${employee.personalInfo.fullName})`} />
      <EmployeeForm
        mode="edit"
        initialData={employee}
        existingEmployees={allEmployees}
        onSave={() => router.push("/employees")}
        onCancel={() => router.push("/employees")}
      />
    </>
  );
}
