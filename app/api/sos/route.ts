import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { executeQuery, executeStatement } from "@/lib/mysql/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      workerName = "Floor Worker",
      workerNumber = "EMP-2026-001",
      workerLine = "Line 1 — Export Hoodies (Sialkot Unit)",
      notes = "Need urgent floor mechanics.",
      senderId,
    } = body;

    // 1. Locate #production-floor channel (or conversation id 2, or first channel)
    let convId = 2;
    try {
      const convRows = await executeQuery<any>(`
        SELECT id FROM chat_conversations
        WHERE title LIKE '%production%' OR type = 'channel'
        ORDER BY id ASC
        LIMIT 1
      `);
      if (convRows.length > 0) {
        convId = convRows[0].id;
      }
    } catch {}

    // 2. Resolve sender ID in MySQL users table
    let validSenderId = 1;
    if (senderId && !isNaN(Number(senderId))) {
      const userRows = await executeQuery<any>("SELECT id FROM users WHERE id = ? LIMIT 1", [Number(senderId)]);
      if (userRows.length > 0) {
        validSenderId = userRows[0].id;
      }
    }

    const uuid = crypto.randomUUID();
    const sosMessage = `🚨 [MACHINE SOS ALERT]: ${workerName} (${workerNumber}) reported an urgent machine breakdown on ${workerLine}. ${notes} Floor mechanics required immediately!`;

    // 3. Insert SOS message into chat_messages
    const result = await executeStatement(
      `INSERT INTO chat_messages (uuid, conversation_id, sender_id, message, message_type, attachment_url, created_at)
       VALUES (?, ?, ?, ?, 'system', NULL, NOW())`,
      [uuid, convId, validSenderId, sosMessage]
    );

    // 4. Update conversation timestamp
    await executeStatement(
      `UPDATE chat_conversations SET updated_at = NOW() WHERE id = ?`,
      [convId]
    );

    return NextResponse.json({
      success: true,
      message: "🚨 Machine SOS alert broadcasted to maintenance and supervisors successfully.",
      data: {
        id: result.insertId,
        conversationId: convId,
        alert: sosMessage,
      },
    });
  } catch (err: any) {
    console.error("Error in POST /api/sos:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to broadcast SOS alert." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const sosRows = await executeQuery<any>(`
      SELECT m.id, m.message, m.created_at, u.name as sender_name, c.title as channel_name
      FROM chat_messages m
      LEFT JOIN users u ON m.sender_id = u.id
      LEFT JOIN chat_conversations c ON m.conversation_id = c.id
      WHERE m.message LIKE '%SOS%' OR m.message LIKE '%breakdown%'
      ORDER BY m.id DESC
      LIMIT 10
    `);

    return NextResponse.json({
      success: true,
      data: sosRows,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
