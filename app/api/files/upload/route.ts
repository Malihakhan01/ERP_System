import { NextResponse } from "next/server";
import { saveDocumentRecord } from "@/lib/mysql/files-db";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentType = (formData.get("documentType") as string) || "general_doc";
    const entityType = (formData.get("entityType") as string) || "products";
    const entityId = parseInt((formData.get("entityId") as string) || "1", 10);
    const title = (formData.get("title") as string) || file?.name || "Uploaded Document";

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file was uploaded." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    // Generate collision-resistant filename
    const ext = path.extname(file.name);
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(uploadDir, uniqueName);
    const publicUrl = `/uploads/${uniqueName}`;

    // Write file to disk
    await fs.writeFile(filePath, buffer);

    // Save record to MySQL
    const docId = await saveDocumentRecord({
      documentType,
      entityType,
      entityId,
      title,
      fileName: file.name,
      filePath: publicUrl,
      fileSizeBytes: file.size,
      mimeType: file.type || "application/octet-stream",
    });

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully.",
      data: {
        id: docId,
        url: publicUrl,
        fileName: file.name,
        fileSize: file.size,
      },
    });
  } catch (error: any) {
    console.error("[File Upload Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "File upload failed." },
      { status: 500 }
    );
  }
}
