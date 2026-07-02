import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_PASSWORD: z.string().min(1),
  APP_SECRET: z.string().min(1),
});

function loadEnv() {
  const raw = {
    DATABASE_URL: process.env.DATABASE_URL,
    APP_PASSWORD: process.env.APP_PASSWORD,
    APP_SECRET: process.env.APP_SECRET,
  };

  if (process.env.NODE_ENV !== "production") {
    if (!raw.APP_PASSWORD) {
      console.warn("[env] APP_PASSWORD가 설정되지 않아 개발용 기본값(changeme)을 사용합니다.");
      raw.APP_PASSWORD = "changeme";
    }
    if (!raw.APP_SECRET) {
      console.warn("[env] APP_SECRET이 설정되지 않아 개발용 기본값을 사용합니다. 운영 배포 전 반드시 교체하세요.");
      raw.APP_SECRET = "dev-only-insecure-secret-change-me";
    }
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    console.error("환경변수 설정이 올바르지 않습니다:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}

export const env = loadEnv();
