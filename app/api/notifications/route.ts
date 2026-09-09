import { NextResponse, NextRequest } from "next/server";
import { executeQuery } from "@/lib/mysql/db";

export interface FactoryNotification {
  id: string;
  type: "sos" | "advance" | "task" | "inventory" | "chat" | "order";
  title: string;
  message: string;
  tag: string;
  timeAgo: string;
  timestamp: string;
  link: string;
  severity: "danger" | "warning" | "info" | "success";
}

/**
 * Role → allowed notification types mapping.
 * super_admin gets everything (null = no filter).
 */
const ROLE_NOTIFICATION_TYPES: Record<string, FactoryNotification["type"][] | null> = {
  super_admin: null, // all
  factory_manager: ["sos", "task", "inventory", "order"], // warehouse + ops + sales
  production_supervisor: ["sos", "task", "inventory"], // floor ops
  qa_inspector: ["sos", "task"], // floor alerts only
  merchandiser: ["order"], // orders & commercial
  finance: ["advance", "order"], // loans + revenue
  operator: ["sos", "task"], // machine / floor level
};

/** Resolve which types this role may see */
function getAllowedTypes(role: string): FactoryNotification["type"][] | null {
  return ROLE_NOTIFICATION_TYPES[role] ?? null;
}

export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get("role") || "super_admin";
  const allowedTypes = getAllowedTypes(role);

  try {
    const notifications: FactoryNotification[] = [];

    // 1. Machine SOS & Urgent Floor Alerts  →  sos
    if (!allowedTypes || allowedTypes.includes("sos")) {
      try {
        const sosRows = await executeQuery<any>(`
          SELECT m.id, m.message, m.created_at, u.name as sender_name
          FROM chat_messages m
          LEFT JOIN users u ON m.sender_id = u.id
          WHERE m.message LIKE '%SOS%' OR m.message LIKE '%breakdown%' OR m.message LIKE '%Emergency assistance%'
          ORDER BY m.id DESC
          LIMIT 3
        `);

        for (const row of sosRows) {
          notifications.push({
            id: `sos-${row.id}`,
            type: "sos",
            title: "🚨 Machine SOS Floor Breakdown",
            message: row.message.replace(/^🚨\s*\[MACHINE SOS ALERT\]:\s*/, ""),
            tag: "Line Maintenance",
            timeAgo: formatTimeAgo(new Date(row.created_at)),
            timestamp: row.created_at,
            link: "/chat",
            severity: "danger",
          });
        }
      } catch {}
    }

    // 2. Pending Salary Advance & Loan Requests  →  advance
    if (!allowedTypes || allowedTypes.includes("advance")) {
      try {
        const advRows = await executeQuery<any>(`
          SELECT a.id, a.advance_number, a.requested_amount, a.created_at, e.full_name as employee_name, e.department
          FROM employee_advances a
          LEFT JOIN employees e ON a.employee_id = e.id
          WHERE a.status = 'Pending' AND a.is_archived = 0
          ORDER BY a.id DESC
          LIMIT 4
        `);

        for (const row of advRows) {
          notifications.push({
            id: `adv-${row.id}`,
            type: "advance",
            title: `Loan Request: ${row.advance_number}`,
            message: `${row.employee_name || "Employee"} requested advance of PKR ${Number(row.requested_amount || 0).toLocaleString()} (${row.department || "Floor"}).`,
            tag: "Finance Approval",
            timeAgo: formatTimeAgo(new Date(row.created_at)),
            timestamp: row.created_at,
            link: "/advances",
            severity: "warning",
          });
        }
      } catch {}
    }

    // 3. Urgent Floor Tasks  →  task
    if (!allowedTypes || allowedTypes.includes("task")) {
      try {
        const taskRows = await executeQuery<any>(`
          SELECT id, task_number, title, priority, status, assigned_to_name, created_at
          FROM employee_tasks
          WHERE status IN ('assigned', 'in_progress') AND priority IN ('urgent', 'high')
          ORDER BY id DESC
          LIMIT 3
        `);

        for (const row of taskRows) {
          notifications.push({
            id: `task-${row.id}`,
            type: "task",
            title: `Task Alert: ${row.task_number}`,
            message: `${row.title} assigned to ${row.assigned_to_name}. Priority: ${row.priority.toUpperCase()}`,
            tag: "Floor Operations",
            timeAgo: formatTimeAgo(new Date(row.created_at)),
            timestamp: row.created_at,
            link: "/employees",
            severity: row.priority === "urgent" ? "danger" : "info",
          });
        }
      } catch {}
    }

    // 4. Low Inventory Stock Alerts  →  inventory
    if (!allowedTypes || allowedTypes.includes("inventory")) {
      try {
        const invRows = await executeQuery<any>(`
          SELECT id, name, sku, available_stock, reorder_point, unit
          FROM inventory_items
          WHERE available_stock <= reorder_point AND is_archived = 0
          LIMIT 2
        `);

        for (const row of invRows) {
          notifications.push({
            id: `inv-${row.id}`,
            type: "inventory",
            title: `Low Stock: ${row.sku}`,
            message: `${row.name} reached reorder threshold (${row.available_stock} ${row.unit} left).`,
            tag: "Warehouse Bay",
            timeAgo: "Live Monitor",
            timestamp: new Date().toISOString(),
            link: "/inventory",
            severity: "warning",
          });
        }
      } catch {}
    }

    // 5. Recent Commercial Export Orders  →  order
    if (!allowedTypes || allowedTypes.includes("order")) {
      try {
        const orderRows = await executeQuery<any>(`
          SELECT id, order_number, client_name, quantity, total_value, currency, created_at
          FROM orders
          WHERE is_archived = 0
          ORDER BY id DESC
          LIMIT 2
        `);

        for (const row of orderRows) {
          notifications.push({
            id: `ord-${row.id}`,
            type: "order",
            title: `Export Order: ${row.order_number}`,
            message: `${row.client_name} - ${row.quantity} pcs (${row.currency} ${Number(row.total_value).toLocaleString()}).`,
            tag: "Sales & Merchandising",
            timeAgo: formatTimeAgo(new Date(row.created_at)),
            timestamp: row.created_at,
            link: "/orders",
            severity: "success",
          });
        }
      } catch {}
    }

    // Sort by timestamp descending
    notifications.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({
      success: true,
      data: notifications,
      role,
      unreadCount: notifications.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

function formatTimeAgo(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (isNaN(diffSec) || diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}
