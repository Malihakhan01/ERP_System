"use client";

import * as React from "react";
import { TopNav } from "@/components/layout/TopNav";
import { EmployeeForm } from "@/components/employees/EmployeeForm";

export default function NewEmployeePage() {
  return (
    <>
      <TopNav title="Onboard New Employee — FactoryOS ERP" />
      <EmployeeForm mode="create" />
    </>
  );
}
