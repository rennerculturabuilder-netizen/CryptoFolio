import { z } from "zod";

export const createPortfolioSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  baseFiat: z.enum(["USD", "BRL"]).optional().default("USD"),
});

export const updatePortfolioSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100).optional(),
  baseFiat: z.enum(["USD", "BRL"]).optional(),
});

export type CreatePortfolioInput = z.infer<typeof createPortfolioSchema>;
export type UpdatePortfolioInput = z.infer<typeof updatePortfolioSchema>;
