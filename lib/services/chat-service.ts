// lib/services/chat-service.ts
import type {
  ChatMessageRecord,
  ChatConversationRecord,
} from "@/lib/mysql/chat-db";

export type { ChatMessageRecord, ChatConversationRecord };

export async function fetchConversations(options?: {
  mode?: "admin_all";
  userId?: string;
}): Promise<ChatConversationRecord[]> {
  try {
    const params = new URLSearchParams();
    if (options?.mode) params.set("mode", options.mode);
    if (options?.userId) params.set("userId", options.userId);

    const res = await fetch(`/api/chat/conversations${params.toString() ? `?${params.toString()}` : ""}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
  } catch (err) {
    console.error("Failed to fetch chat conversations:", err);
  }
  return [];
}

export async function fetchConversationMessages(
  conversationId: string,
  afterId?: string
): Promise<ChatMessageRecord[]> {
  try {
    const params = new URLSearchParams({ conversationId });
    if (afterId) params.set("after", afterId);

    const res = await fetch(`/api/chat/messages?${params.toString()}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
  } catch (err) {
    console.error("Failed to fetch messages:", err);
  }
  return [];
}

export async function postChatMessage(data: {
  conversationId: string;
  message: string;
  messageType?: "text" | "image" | "techpack_ref" | "system";
  attachmentUrl?: string;
  senderId?: string;
}): Promise<ChatMessageRecord | null> {
  try {
    const res = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
  } catch (err) {
    console.error("Failed to post message:", err);
  }
  return null;
}

export async function startDirectChat(
  targetUserId: string,
  senderId?: string
): Promise<string | null> {
  try {
    const res = await fetch("/api/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId, senderId }),
    });
    const json = await res.json();
    if (json.success && json.conversationId) {
      return json.conversationId;
    }
  } catch (err) {
    console.error("Failed to start direct chat:", err);
  }
  return null;
}

export async function markChatRead(
  conversationId: string,
  lastMessageId?: string
): Promise<boolean> {
  try {
    const res = await fetch("/api/chat/read", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, lastMessageId }),
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch {
    return false;
  }
}

export async function fetchUnreadChatCount(): Promise<number> {
  try {
    const res = await fetch("/api/chat/conversations?view=unread_count");
    const json = await res.json();
    if (json.success && typeof json.unreadCount === "number") {
      return json.unreadCount;
    }
  } catch {}
  return 0;
}
