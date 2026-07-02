import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getClaudeClient, OCR_MODEL } from "./claude-client";
import { OCR_SYSTEM_PROMPT, OCR_USER_PROMPT } from "./prompt";
import { ocrResultSchema, type OcrResult } from "./schema";

export async function extractSlipFromFile(params: {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "application/pdf";
}): Promise<OcrResult> {
  const client = getClaudeClient();

  const fileBlock =
    params.mediaType === "application/pdf"
      ? {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: params.base64,
          },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: params.mediaType,
            data: params.base64,
          },
        };

  const response = await client.messages.parse({
    model: OCR_MODEL,
    max_tokens: 4096,
    thinking: { type: "disabled" },
    system: OCR_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [fileBlock, { type: "text", text: OCR_USER_PROMPT }],
      },
    ],
    output_config: {
      format: zodOutputFormat(ocrResultSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("OCR 응답을 해석할 수 없습니다.");
  }
  return response.parsed_output;
}
