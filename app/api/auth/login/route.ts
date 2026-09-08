import { NextResponse } from "next/server";
import { DEMO_USERS, AuthUser } from "@/lib/auth/auth-types";
import { executeQuery } from "@/lib/mysql/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, plant } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    // 1. Check MySQL users table first with exact password match
    try {
      const dbUsers = await executeQuery<any>(
        "SELECT * FROM users WHERE LOWER(email) = ? AND is_active = 1 LIMIT 1",
        [normalizedEmail]
      );

      if (dbUsers.length > 0) {
        const dbUser = dbUsers[0];

        // Strict password check against MySQL record
        if (dbUser.password !== trimmedPassword) {
          return NextResponse.json(
            {
              success: false,
              message: "Incorrect password. Security access denied.",
            },
            { status: 401 }
          );
        }

        const user: AuthUser = {
          id: dbUser.id || dbUser.uuid,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role || "super_admin",
          roleTitle:
            dbUser.role === "super_admin"
              ? "Super Administrator (Director)"
              : dbUser.role === "production_supervisor"
              ? "Production Floor Supervisor"
              : dbUser.role === "finance"
              ? "Head of Accounts & Payroll"
              : dbUser.role === "factory_manager"
              ? "Warehouse & Inventory Lead"
              : "Factory Operator",
          department: dbUser.department || "Operations",
          plant: plant || "Unit 1 - Korangi Garment Hub",
          initials:
            dbUser.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "OP",
          lastLogin: new Date().toISOString(),
        };

        const res = NextResponse.json({
          success: true,
          message: `Authentication successful. Welcome, ${user.name}`,
          user,
        });

        res.cookies.set("factoryos_session", JSON.stringify(user), {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        });

        return res;
      }
    } catch (dbErr) {
      console.warn("MySQL Auth fallback to preset definitions:", dbErr);
    }

    // 2. Check predefined demo profiles with STRICT password verification
    const matchedDemoKey = Object.keys(DEMO_USERS).find(
      (k) => DEMO_USERS[k].email.toLowerCase() === normalizedEmail
    );

    if (matchedDemoKey) {
      const demo = DEMO_USERS[matchedDemoKey];

      // Strict password match required
      if (trimmedPassword !== demo.password) {
        return NextResponse.json(
          {
            success: false,
            message: "Incorrect password. Security access denied.",
          },
          { status: 401 }
        );
      }

      const user: AuthUser = {
        id: demo.id,
        name: demo.name,
        email: demo.email,
        role: demo.role,
        roleTitle: demo.roleTitle,
        department: demo.department,
        plant: plant || demo.plant,
        initials: demo.initials,
        avatarColor: demo.avatarColor,
        lastLogin: new Date().toISOString(),
      };

      const res = NextResponse.json({
        success: true,
        message: `Welcome back, ${user.name}`,
        user,
      });

      res.cookies.set("factoryos_session", JSON.stringify(user), {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });

      return res;
    }

    // 3. User not found or incorrect
    return NextResponse.json(
      {
        success: false,
        message: "Invalid email or security credentials.",
      },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Authentication service error." },
      { status: 500 }
    );
  }
}
