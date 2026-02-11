import { z } from "zod";

export const dcaZoneSchema = z.object({
  portfolioId: z.string().min(1),
  assetSymbol: z.string().min(1).max(10),
  priceMin: z.string().regex(/^\d+\.?\d*$/, "priceMin inválido"),
  priceMax: z.string().regex(/^\d+\.?\d*$/, "priceMax inválido"),
  percentualBase: z.string().regex(/^\d+\.?\d*$/, "percentualBase inválido"),
  order: z.number().int().min(1).default(1),
  label: z.string().max(50).optional(),
});

export const updateDcaZoneSchema = z.object({
  priceMin: z.string().regex(/^\d+\.?\d*$/, "priceMin inválido").optional(),
  priceMax: z.string().regex(/^\d+\.?\d*$/, "priceMax inválido").optional(),
  percentualBase: z.string().regex(/^\d+\.?\d*$/, "percentualBase inválido").optional(),
  order: z.number().int().min(1).optional(),
  label: z.string().max(50).nullable().optional(),
  executed: z.boolean().optional(),
});

export type DcaZoneInput = z.infer<typeof dcaZoneSchema>;
export type UpdateDcaZoneInput = z.infer<typeof updateDcaZoneSchema>;
