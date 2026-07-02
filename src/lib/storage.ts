import path from "node:path";

/** 임시/기본 저장소. Vercel 환경에서는 파일 시스템(uploads) 쓰기가 불가능하므로, Base64 Data URI로 변환하여 DB에 바로 저장합니다.
 * 나중에 AWS S3, Vercel Blob 등 클라우드 스토리지로 교체할 때 이 함수만 바꾸면 됩니다. */
export async function saveUploadedFile(buffer: Buffer, originalName: string): Promise<string> {
  const ext = path.extname(originalName).toLowerCase();
  const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
  const base64 = buffer.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}
