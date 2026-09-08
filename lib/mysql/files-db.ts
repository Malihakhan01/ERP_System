/**
 * FactoryOS Garment ERP — System Documents & File Storage Repository
 * Tracks uploaded tech pack PDFs, employee docs, and manifests.
 */

import { executeQuery, executeStatement } from "./db";
import crypto from "crypto";

export interface SystemDocumentRecord {
  id?: number;
  uuid?: string;
  documentType: string;
  entityType: string;
  entityId: number;
  title: string;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedBy?: string;
  createdAt?: string;
}

export async function saveDocumentRecord(doc: SystemDocumentRecord): Promise<number> {
  const uuid = doc.uuid || crypto.randomUUID();
  const res = await executeStatement(
    `INSERT INTO \`system_documents\`
     (\`uuid\`, \`document_type\`, \`entity_type\`, \`entity_id\`, \`title\`, \`file_name\`, \`file_path\`, \`file_size_bytes\`, \`mime_type\`, \`uploaded_by\`)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuid,
      doc.documentType,
      doc.entityType,
      doc.entityId,
      doc.title,
      doc.fileName,
      doc.filePath,
      doc.fileSizeBytes,
      doc.mimeType,
      doc.uploadedBy || "System Admin",
    ]
  );

  return res.insertId;
}

export async function getDocumentsByEntity(
  entityType: string,
  entityId: number
): Promise<SystemDocumentRecord[]> {
  const rows = await executeQuery<any>(
    "SELECT * FROM `system_documents` WHERE `entity_type` = ? AND `entity_id` = ? ORDER BY `created_at` DESC",
    [entityType, entityId]
  );

  return rows.map((r) => ({
    id: r.id,
    uuid: r.uuid,
    documentType: r.document_type,
    entityType: r.entity_type,
    entityId: r.entity_id,
    title: r.title,
    fileName: r.file_name,
    filePath: r.file_path,
    fileSizeBytes: r.file_size_bytes,
    mimeType: r.mime_type,
    uploadedBy: r.uploaded_by,
    createdAt: r.created_at,
  }));
}
