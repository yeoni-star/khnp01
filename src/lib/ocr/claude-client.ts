import Anthropic from "@anthropic-ai/sdk";

export function getClaudeClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

// 영수증 텍스트 추출은 깊은 추론이 필요 없는 작업이라 Sonnet 5를 사용한다.
export const OCR_MODEL = "claude-sonnet-5";
