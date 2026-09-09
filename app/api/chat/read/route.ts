// app/api/chat/read/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { markConversationAsRead } from "@/lib/mysql/chat-db";
import { executeQuery } from "@/lib/mysql/db";

function getSessionUser(req: NextRequest) {
  const sessionCookie = req.cookies.get("factoryos_session")?.value;
  if (sessionCookie) {
    try {
      return JSON.parse(sessionCookie);
    } catch {}
  }
  return null;
}

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = getSessionUser(req);
    const body = await req.json();
    const { conversationId, lastMessageId, userId } = body;

    let currentUserId = sessionUser?.id || userId;
    if (!currentUserId) {
      const dbUsers = await executeQuery<any>("SELECT id FROM users LIMIT 1");
      if (dbUsers.length > 0) currentUserId = dbUsers[0].id;
    }

    if (!conversationId || !currentUserId) {
      return NextResponse.json(
        { success: false, message: "conversationId and userId are required." },
        { status: 400 }
      );
    }

    const success = await markConversationAsRead(conversationId, currentUserId, lastMessageId);

    return NextResponse.json({ success });
  } catch (err: any) {
    console.error("Error in PUT /api/chat/read:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to mark as read." },
      { status: 500 }
    );
  }
}
