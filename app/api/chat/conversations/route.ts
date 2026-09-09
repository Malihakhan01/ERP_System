// app/api/chat/conversations/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getUserConversations,
  getAdminAllConversations,
  getOrCreateDirectConversation,
  getUnreadChatCountForUser,
} from "@/lib/mysql/chat-db";
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
    const sessionUser = getSessionUser(req);
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode");
    const view = searchParams.get("view");
    const requestedUserId = searchParams.get("userId");

    // Resolve user ID: prioritize client session requestedUserId, then sessionCookie
    let currentUserId = requestedUserId || sessionUser?.id;
    let userRole = sessionUser?.role;

    if (currentUserId && !userRole) {
      const uRows = await executeQuery<any>("SELECT role FROM users WHERE id = ? LIMIT 1", [currentUserId]);
      if (uRows.length > 0) {
        userRole = uRows[0].role;
      }
    }

    if (!currentUserId) {
      // Lookup default super admin user from DB
      const dbUsers = await executeQuery<any>("SELECT id, role FROM users LIMIT 1");
      if (dbUsers.length > 0) {
        currentUserId = dbUsers[0].id;
        userRole = dbUsers[0].role;
      }
    }

    if (!currentUserId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. No user session detected." },
        { status: 401 }
      );
    }

    // View: Unread count only (for TopNav badge)
    if (view === "unread_count") {
      const unreadCount = await getUnreadChatCountForUser(currentUserId);
      return NextResponse.json({ success: true, unreadCount });
    }

    // View: Admin Surveillance Mode (view ALL conversations across all users)
    if (mode === "admin_all") {
      const isAdmin =
        userRole === "super_admin" ||
        userRole === "admin" ||
        userRole === "factory_manager" ||
        sessionUser?.role === "super_admin";

      if (!isAdmin) {
        return NextResponse.json(
          {
            success: false,
            message: "Access denied. Only system administrators can access global surveillance mode.",
          },
          { status: 403 }
        );
      }

      const allConversations = await getAdminAllConversations();
      return NextResponse.json({
        success: true,
        mode: "admin_all",
        data: allConversations,
      });
    }

    // Standard View: User's conversations
    const conversations = await getUserConversations(currentUserId);
    return NextResponse.json({
      success: true,
      data: conversations,
    });
  } catch (err: any) {
    console.error("Error in GET /api/chat/conversations:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to load conversations." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = getSessionUser(req);
    const body = await req.json();
    const { targetUserId, senderId } = body;

    let currentUserId = sessionUser?.id || senderId;
    if (!currentUserId) {
      const dbUsers = await executeQuery<any>("SELECT id FROM users LIMIT 1");
      if (dbUsers.length > 0) currentUserId = dbUsers[0].id;
    }

    if (!currentUserId || !targetUserId) {
      return NextResponse.json(
        { success: false, message: "Target user ID is required to start a chat." },
        { status: 400 }
      );
    }

    const convId = await getOrCreateDirectConversation(currentUserId, targetUserId);
    if (!convId) {
      return NextResponse.json(
        { success: false, message: "Could not create direct conversation." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      conversationId: convId,
      message: "Direct conversation ready.",
    });
  } catch (err: any) {
    console.error("Error in POST /api/chat/conversations:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to create conversation." },
      { status: 500 }
    );
  }
}
