import { NextResponse } from "next/server";
import { executeQuery, executeStatement } from "@/lib/mysql/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ success: false, message: "Email is required" }, { status: 400 });
    }

    const rows = await executeQuery<any>(
      "SELECT id, uuid, name, email, role, department, is_active, created_at, updated_at FROM users WHERE email = ? LIMIT 1",
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { email, name, department, currentPassword, newPassword } = body;

    if (!email) {
      return NextResponse.json({ success: false, message: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Fetch existing user
    const rows = await executeQuery<any>(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const existingUser = rows[0];

    // If password change is requested, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, message: "Current password is required to set a new password." },
          { status: 400 }
        );
      }

      if (existingUser.password !== currentPassword.trim()) {
        return NextResponse.json(
          { success: false, message: "Current password does not match our records." },
          { status: 401 }
        );
      }

      if (newPassword.trim().length < 6) {
        return NextResponse.json(
          { success: false, message: "New password must be at least 6 characters long." },
          { status: 400 }
        );
      }

      // Update password in MySQL
      await executeStatement(
        "UPDATE users SET password = ? WHERE email = ?",
        [newPassword.trim(), normalizedEmail]
      );
    }

    // Update name and department if provided
    if (name || department) {
      await executeStatement(
        "UPDATE users SET name = COALESCE(?, name), department = COALESCE(?, department) WHERE email = ?",
        [name ? name.trim() : null, department ? department.trim() : null, normalizedEmail]
      );
    }

    // Fetch updated record
    const updatedRows = await executeQuery<any>(
      "SELECT id, uuid, name, email, role, department, is_active, created_at, updated_at FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully in MySQL.",
      user: updatedRows[0],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
