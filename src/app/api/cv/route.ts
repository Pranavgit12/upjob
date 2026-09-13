import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { extractCvText, isAcceptedCv, MAX_CV_BYTES, cvMimeType, sanitizeFileKey, saveCvFile } from "@/lib/cvParse";
import { parseCV } from "@/lib/ai/service";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (!isAcceptedCv(file.name, file.type)) {
    return NextResponse.json({ error: "Upload a PDF, DOC or DOCX file." }, { status: 400 });
  }
  if (file.size > MAX_CV_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_CV_BYTES / 1024 / 1024} MB.` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) return NextResponse.json({ error: "Empty file" }, { status: 400 });

  let text = "";
  try {
    text = await extractCvText(file.name, buffer);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not read this file." },
      { status: 422 }
    );
  }
  if (!text) {
    return NextResponse.json({ error: "No readable text found in this file. Some scanned PDFs need OCR which isn't enabled yet." }, { status: 422 });
  }

  const key = sanitizeFileKey(file.name, `${user.id}_${Date.now()}`);
  const { key: s3Key, url: fileUrl } = await saveCvFile(key, buffer);

  const structured = await parseCV(text);

  // Make new resume primary, demote others.
  const resume = await prisma.$transaction(async (tx) => {
    await tx.resume.updateMany({ where: { userId: user.id }, data: { isPrimary: false } });
    const created = await tx.resume.create({
      data: {
        userId: user.id,
        fileName: file.name,
        fileUrl: "",
        fileSize: buffer.length,
        mimeType: cvMimeType(file.name),
        path: s3Key,
        parsedText: text.slice(0, 60000),
        structuredData: structured as unknown as Prisma.InputJsonValue,
        isPrimary: true,
      },
    });
    return tx.resume.update({ where: { id: created.id }, data: { fileUrl } });
  });

  return NextResponse.json({
    ok: true,
    resume: {
      id: resume.id,
      fileName: resume.fileName,
      fileUrl: resume.fileUrl,
      parsed: cvSummary(structured as unknown as Prisma.JsonValue),
    },
  });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const resumes = await prisma.resume.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, fileName: true, fileUrl: true, fileSize: true, mimeType: true, isPrimary: true, createdAt: true, structuredData: true },
  });
  return NextResponse.json({
    resumes: resumes.map((r) => ({
      ...r,
      parsed: r.structuredData ? cvSummary(r.structuredData as never) : null,
    })),
  });
}

function cvSummary(structured: Prisma.JsonValue): {
  name?: string;
  email?: string;
  phone?: string;
  skills?: string[];
} {
  const s = (structured ?? {}) as Record<string, unknown>;
  return {
    name: typeof s.name === "string" ? s.name : undefined,
    email: typeof s.email === "string" ? s.email : undefined,
    phone: typeof s.phone === "string" ? s.phone : undefined,
    skills: Array.isArray(s.skills) ? (s.skills as string[]).slice(0, 12) : undefined,
  };
}
