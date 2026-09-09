/**
 * FactoryOS Garment ERP — Live Chat & Internal Messaging MySQL Repository
 * Peer-to-peer messaging, department channels, and administrative audit monitoring.
 */

import { executeQuery, executeStatement } from "./db";
import crypto from "crypto";

export interface ChatMessageRecord {
  id: string;
  uuid: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderRole: string;
  senderDepartment: string;
  senderInitials: string;
  message: string;
  messageType: "text" | "image" | "techpack_ref" | "system";
  attachmentUrl?: string;
  createdAt: string;
}

export interface ChatConversationRecord {
  id: string;
  uuid: string;
  type: "direct" | "channel";
  title?: string;
  description?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  // Metadata
  otherParticipant?: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    initials: string;
  };
  participants?: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
  lastMessage?: {
    id: string;
    message: string;
    senderName: string;
    createdAt: string;
  };
  unreadCount: number;
  totalMessagesCount?: number;
}

function getInitials(name: string): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Get active conversations for a specific user
 */
export async function getUserConversations(
  userId: string | number
): Promise<ChatConversationRecord[]> {
  try {
    const numUserId = Number(userId);

    // 1. Get all conversations the user is a participant in
    const convRows = await executeQuery<any>(
      `SELECT c.id, c.uuid, c.type, c.title, c.description, c.created_by, c.created_at, c.updated_at,
              cp.last_read_at, cp.last_read_message_id
       FROM chat_conversations c
       JOIN chat_participants cp ON c.id = cp.conversation_id
       WHERE cp.user_id = ?
       ORDER BY c.updated_at DESC`,
      [numUserId]
    );

    const conversations: ChatConversationRecord[] = [];

    for (const conv of convRows) {
      const convId = conv.id;

      // Other participant if direct
      let otherParticipant: any = null;
      if (conv.type === "direct") {
        const otherRows = await executeQuery<any>(
          `SELECT u.id, u.name, u.email, u.role, u.department
           FROM chat_participants cp
           JOIN users u ON cp.user_id = u.id
           WHERE cp.conversation_id = ? AND cp.user_id != ?
           LIMIT 1`,
          [convId, numUserId]
        );
        if (otherRows.length > 0) {
          const o = otherRows[0];
          otherParticipant = {
            id: String(o.id),
            name: o.name,
            email: o.email,
            role: o.role,
            department: o.department || "Factory Floor",
            initials: getInitials(o.name),
          };
        }
      }

      // Last message
      const msgRows = await executeQuery<any>(
        `SELECT m.id, m.message, m.created_at, u.name as sender_name
         FROM chat_messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.conversation_id = ?
         ORDER BY m.id DESC
         LIMIT 1`,
        [convId]
      );

      let lastMessage: any = null;
      if (msgRows.length > 0) {
        lastMessage = {
          id: String(msgRows[0].id),
          message: msgRows[0].message,
          senderName: msgRows[0].sender_name,
          createdAt: msgRows[0].created_at,
        };
      }

      // Unread count
      const lastReadId = conv.last_read_message_id ? Number(conv.last_read_message_id) : 0;
      const unreadRows = await executeQuery<any>(
        `SELECT COUNT(*) as unread_count
         FROM chat_messages
         WHERE conversation_id = ? AND id > ? AND sender_id != ?`,
        [convId, lastReadId, numUserId]
      );
      const unreadCount = Number(unreadRows[0]?.unread_count || 0);

      conversations.push({
        id: String(conv.id),
        uuid: conv.uuid,
        type: conv.type,
        title: conv.title || (otherParticipant ? otherParticipant.name : "Direct Message"),
        description: conv.description || "",
        createdBy: conv.created_by ? String(conv.created_by) : undefined,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
        otherParticipant,
        lastMessage,
        unreadCount,
      });
    }

    return conversations;
  } catch (err) {
    console.error("Error in getUserConversations:", err);
    return [];
  }
}

/**
 * Admin Surveillance & Global Audit: Query every single conversation across all users in the system
 */
export async function getAdminAllConversations(): Promise<ChatConversationRecord[]> {
  try {
    const convRows = await executeQuery<any>(
      `SELECT c.id, c.uuid, c.type, c.title, c.description, c.created_by, c.created_at, c.updated_at,
              COUNT(m.id) as total_messages
       FROM chat_conversations c
       LEFT JOIN chat_messages m ON c.id = m.conversation_id
       GROUP BY c.id
       ORDER BY c.updated_at DESC`
    );

    const result: ChatConversationRecord[] = [];

    for (const conv of convRows) {
      const convId = conv.id;

      // Get participants
      const partRows = await executeQuery<any>(
        `SELECT u.id, u.name, u.email, u.role, u.department
         FROM chat_participants cp
         JOIN users u ON cp.user_id = u.id
         WHERE cp.conversation_id = ?`,
        [convId]
      );

      const participants = partRows.map((p) => ({
        id: String(p.id),
        name: p.name,
        email: p.email,
        role: p.role,
        department: p.department || "Operations",
        initials: getInitials(p.name),
      }));

      // Last message
      const msgRows = await executeQuery<any>(
        `SELECT m.id, m.message, m.created_at, u.name as sender_name
         FROM chat_messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.conversation_id = ?
         ORDER BY m.id DESC
         LIMIT 1`,
        [convId]
      );

      let lastMessage: any = null;
      if (msgRows.length > 0) {
        lastMessage = {
          id: String(msgRows[0].id),
          message: msgRows[0].message,
          senderName: msgRows[0].sender_name,
          createdAt: msgRows[0].created_at,
        };
      }

      let dynamicTitle = conv.title;
      if (conv.type === "direct" && participants.length >= 2) {
        dynamicTitle = `${participants[0].name} ↔ ${participants[1].name}`;
      } else if (conv.type === "direct" && participants.length === 1) {
        dynamicTitle = `Direct Chat: ${participants[0].name}`;
      }

      result.push({
        id: String(conv.id),
        uuid: conv.uuid,
        type: conv.type,
        title: dynamicTitle || "Untitled Thread",
        description: conv.description || "",
        createdBy: conv.created_by ? String(conv.created_by) : undefined,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
        otherParticipant: participants.length > 0 ? participants[0] : undefined,
        participants,
        lastMessage,
        unreadCount: 0,
        totalMessagesCount: Number(conv.total_messages || 0),
      });
    }

    return result;
  } catch (err) {
    console.error("Error in getAdminAllConversations:", err);
    return [];
  }
}

/**
 * Get messages inside a conversation with optional afterId for delta sync
 */
export async function getConversationMessages(
  conversationId: string | number,
  options?: { afterId?: string | number; limit?: number }
): Promise<ChatMessageRecord[]> {
  try {
    const numConvId = Number(conversationId);
    const limit = options?.limit || 100;
    const afterId = options?.afterId ? Number(options.afterId) : 0;

    let query = `
      SELECT m.id, m.uuid, m.conversation_id, m.sender_id, m.message, m.message_type,
             m.attachment_url, m.created_at,
             u.name as sender_name, u.email as sender_email, u.role as sender_role, u.department as sender_department
      FROM chat_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
    `;
    const params: any[] = [numConvId];

    if (afterId > 0) {
      query += ` AND m.id > ?`;
      params.push(afterId);
    }

    query += ` ORDER BY m.id ASC LIMIT ?`;
    params.push(limit);

    const rows = await executeQuery<any>(query, params);

    return rows.map((r) => ({
      id: String(r.id),
      uuid: r.uuid,
      conversationId: String(r.conversation_id),
      senderId: String(r.sender_id),
      senderName: r.sender_name,
      senderEmail: r.sender_email,
      senderRole: r.sender_role,
      senderDepartment: r.sender_department || "Factory",
      senderInitials: getInitials(r.sender_name),
      message: r.message,
      messageType: r.message_type,
      attachmentUrl: r.attachment_url || undefined,
      createdAt: r.created_at,
    }));
  } catch (err) {
    console.error("Error in getConversationMessages:", err);
    return [];
  }
}

/**
 * Send a message in a conversation
 */
export async function sendChatMessage(
  conversationId: string | number,
  senderId: string | number,
  message: string,
  messageType: "text" | "image" | "techpack_ref" | "system" = "text",
  attachmentUrl?: string
): Promise<ChatMessageRecord | null> {
  try {
    const numConvId = Number(conversationId);
    const numSenderId = Number(senderId);
    const uuid = crypto.randomUUID();

    // 1. Insert message
    const res = await executeStatement(
      `INSERT INTO chat_messages (uuid, conversation_id, sender_id, message, message_type, attachment_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid, numConvId, numSenderId, message, messageType, attachmentUrl || null]
    );

    const newMsgId = res.insertId;

    // 2. Touch conversation updated_at
    await executeStatement(
      `UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [numConvId]
    );

    // 3. Update sender's read marker
    await executeStatement(
      `UPDATE chat_participants
       SET last_read_message_id = ?, last_read_at = CURRENT_TIMESTAMP
       WHERE conversation_id = ? AND user_id = ?`,
      [newMsgId, numConvId, numSenderId]
    );

    // 4. Fetch the inserted message with user join
    const rows = await executeQuery<any>(
      `SELECT m.id, m.uuid, m.conversation_id, m.sender_id, m.message, m.message_type,
              m.attachment_url, m.created_at,
              u.name as sender_name, u.email as sender_email, u.role as sender_role, u.department as sender_department
       FROM chat_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [newMsgId]
    );

    if (rows.length === 0) return null;

    const r = rows[0];
    return {
      id: String(r.id),
      uuid: r.uuid,
      conversationId: String(r.conversation_id),
      senderId: String(r.sender_id),
      senderName: r.sender_name,
      senderEmail: r.sender_email,
      senderRole: r.sender_role,
      senderDepartment: r.sender_department || "Factory",
      senderInitials: getInitials(r.sender_name),
      message: r.message,
      messageType: r.message_type,
      attachmentUrl: r.attachment_url || undefined,
      createdAt: r.created_at,
    };
  } catch (err) {
    console.error("Error in sendChatMessage:", err);
    return null;
  }
}

/**
 * Get or create a 1-on-1 direct conversation between two users
 */
export async function getOrCreateDirectConversation(
  userAId: string | number,
  userBId: string | number
): Promise<string | null> {
  try {
    const a = Number(userAId);
    const b = Number(userBId);

    if (a === b) return null;

    // Check if a direct conversation already exists containing both users
    const existing = await executeQuery<any>(
      `SELECT cp1.conversation_id
       FROM chat_participants cp1
       JOIN chat_participants cp2 ON cp1.conversation_id = cp2.conversation_id
       JOIN chat_conversations c ON cp1.conversation_id = c.id
       WHERE c.type = 'direct' AND cp1.user_id = ? AND cp2.user_id = ?
       LIMIT 1`,
      [a, b]
    );

    if (existing.length > 0) {
      return String(existing[0].conversation_id);
    }

    // Create new direct conversation
    const uuid = crypto.randomUUID();
    const convRes = await executeStatement(
      `INSERT INTO chat_conversations (uuid, type, created_by) VALUES (?, 'direct', ?)`,
      [uuid, a]
    );
    const convId = convRes.insertId;

    // Add both participants
    await executeStatement(
      `INSERT INTO chat_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)`,
      [convId, a, convId, b]
    );

    return String(convId);
  } catch (err) {
    console.error("Error in getOrCreateDirectConversation:", err);
    return null;
  }
}

/**
 * Mark a conversation as read by a user
 */
export async function markConversationAsRead(
  conversationId: string | number,
  userId: string | number,
  lastMessageId?: string | number
): Promise<boolean> {
  try {
    const numConvId = Number(conversationId);
    const numUserId = Number(userId);

    let targetMsgId: number | null = null;
    if (lastMessageId) {
      targetMsgId = Number(lastMessageId);
    } else {
      const maxMsg = await executeQuery<any>(
        `SELECT MAX(id) as max_id FROM chat_messages WHERE conversation_id = ?`,
        [numConvId]
      );
      targetMsgId = maxMsg[0]?.max_id ? Number(maxMsg[0].max_id) : null;
    }

    await executeStatement(
      `UPDATE chat_participants
       SET last_read_message_id = COALESCE(?, last_read_message_id),
           last_read_at = CURRENT_TIMESTAMP
       WHERE conversation_id = ? AND user_id = ?`,
      [targetMsgId, numConvId, numUserId]
    );

    return true;
  } catch (err) {
    console.error("Error in markConversationAsRead:", err);
    return false;
  }
}

/**
 * Get total unread messages count across all conversations for a user
 */
export async function getUnreadChatCountForUser(userId: string | number): Promise<number> {
  try {
    const numUserId = Number(userId);
    const rows = await executeQuery<any>(
      `SELECT COUNT(m.id) as total_unread
       FROM chat_messages m
       JOIN chat_participants cp ON m.conversation_id = cp.conversation_id
       WHERE cp.user_id = ?
         AND m.sender_id != ?
         AND m.id > COALESCE(cp.last_read_message_id, 0)`,
      [numUserId, numUserId]
    );

    return Number(rows[0]?.total_unread || 0);
  } catch (err) {
    console.error("Error in getUnreadChatCountForUser:", err);
    return 0;
  }
}
