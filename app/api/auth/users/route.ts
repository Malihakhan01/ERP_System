import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/mysql/db";
import { DEMO_USERS, AuthUser } from "@/lib/auth/auth-types";

export async function GET() {
  try {
    const rows = await executeQuery<any>(
      "SELECT id, uuid, name, email, role, department, is_active FROM users WHERE is_active = 1 ORDER BY id ASC"
    );

    if (rows && rows.length > 0) {
      const users: AuthUser[] = rows.map((r) => ({
        id: r.id || r.uuid,
        name: r.name,
        email: r.email,
        role: r.role,
        roleTitle:
          r.role === "super_admin"
            ? "Super Administrator (Director)"
            : r.role === "production_supervisor"
            ? "Production Floor Supervisor"
            : r.role === "finance"
            ? "Head of Accounts & Payroll"
            : r.role === "factory_manager"
            ? "Warehouse & Inventory Lead"
            : "Factory Operator",
        department: r.department || "Operations",
        plant: "Unit 1 - Small Industrial Estate, Sialkot",
        initials:
          r.name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "OP",
      }));

      return NextResponse.json({ success: true, users });
    }

    // Fallback to demo definitions if table is empty
    const fallbackUsers: AuthUser[] = Object.values(DEMO_USERS);
    return NextResponse.json({ success: true, users: fallbackUsers });
  } catch (error: any) {
    console.warn("Failed to fetch users from MySQL, falling back to static config:", error.message);
    const fallbackUsers: AuthUser[] = Object.values(DEMO_USERS);
    return NextResponse.json({ success: true, users: fallbackUsers });
  }
}
