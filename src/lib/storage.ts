import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

/** 로컬 파일시스템 저장소. 나중에 클라우드 스토리지로 교체할 때 이 함수만 바꾸면 된다. */
export async function saveUploadedFile(buffer: Buffer, originalName: string): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(originalName) || "";
  const filename = `${randomUUID()}${ext}`;
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return path.join("storage", "uploads", filename);
}
