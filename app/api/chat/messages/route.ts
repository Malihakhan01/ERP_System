// app/api/chat/messages/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getConversationMessages, sendChatMessage } from "@/lib/mysql/chat-db";
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const after = searchParams.get("after");
    const limit = searchParams.get("limit");

    if (!conversationId) {
      return NextResponse.json(
        { success: false, message: "conversationId query parameter is required." },
        { status: 400 }
      );
    }

    const messages = await getConversationMessages(conversationId, {
      afterId: after ? Number(after) : undefined,
      limit: limit ? Number(limit) : 100,
    });

    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (err: any) {
    console.error("Error in GET /api/chat/messages:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to load messages." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = getSessionUser(req);
    const body = await req.json();
    const { conversationId, message, messageType, attachmentUrl, senderId } = body;

    let currentUserId = sessionUser?.id || senderId;
    if (!currentUserId) {
      const dbUsers = await executeQuery<any>("SELECT id FROM users LIMIT 1");
      if (dbUsers.length > 0) currentUserId = dbUsers[0].id;
    }

    if (!conversationId) {
      return NextResponse.json(
        { success: false, message: "conversationId is required." },
        { status: 400 }
      );
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, message: "Message text cannot be empty." },
        { status: 400 }
      );
    }

    const created = await sendChatMessage(
      conversationId,
      currentUserId,
      message.trim(),
      messageType || "text",
      attachmentUrl
    );

    if (!created) {
      return NextResponse.json(
        { success: false, message: "Could not save message." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: created,
    });
  } catch (err: any) {
    console.error("Error in POST /api/chat/messages:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to post message." },
      { status: 500 }
    );
  }
}
