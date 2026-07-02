import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env";

export class OcrNotConfiguredError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY가 설정되지 않아 OCR을 사용할 수 없습니다.");
    this.name = "OcrNotConfiguredError";
  }
}

export function getClaudeClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new OcrNotConfiguredError();
  }
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

// 영수증 텍스트 추출은 깊은 추론이 필요 없는 작업이라 Sonnet 5를 사용한다.
export const OCR_MODEL = "claude-sonnet-5";
