import { z } from "zod";

export const buyBandSchema = z.object({
  portfolioId: z.string().min(1),
  assetId: z.string().min(1),
  targetPrice: z.string().regex(/^\d+\.?\d*$/, "targetPrice inválido"),
  quantity: z.string().regex(/^\d+\.?\d*$/, "quantity inválido"),
  order: z.number().int().min(0).default(0),
});

export const updateBuyBandSchema = z.object({
  targetPrice: z.string().regex(/^\d+\.?\d*$/, "targetPrice inválido").optional(),
  quantity: z.string().regex(/^\d+\.?\d*$/, "quantity inválido").optional(),
  executed: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

export type BuyBandInput = z.infer<typeof buyBandSchema>;
export type UpdateBuyBandInput = z.infer<typeof updateBuyBandSchema>;
