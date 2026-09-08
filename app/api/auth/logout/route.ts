import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({
    success: true,
    message: "Session terminated successfully.",
  });

  res.cookies.set("factoryos_session", "", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  res.cookies.set("factoryos_user", "", {
    httpOnly: false,
    maxAge: 0,
    path: "/",
  });

  return res;
}
