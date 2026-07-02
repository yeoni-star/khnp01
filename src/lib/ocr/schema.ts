import { z } from "zod";

export const ocrItemSchema = z.object({
  itemName: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  unitPrice: z.number().nullable(),
  amount: z.number().nullable(),
});

export const ocrResultSchema = z.object({
  vendorNameGuess: z.string().nullable(),
  deliveryDateGuess: z.string().nullable(),
  items: z.array(ocrItemSchema),
  notes: z.string().nullable(),
});

export type OcrItem = z.infer<typeof ocrItemSchema>;
export type OcrResult = z.infer<typeof ocrResultSchema>;
