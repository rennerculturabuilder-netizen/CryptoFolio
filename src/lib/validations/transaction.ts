import { z } from "zod";

export const createTransactionSchema = z.object({
  type: z.enum(["BUY", "SELL"]),
  quantity: z
    .number()
    .positive("Quantidade deve ser positiva")
    .or(z.string().transform((v) => parseFloat(v)))
    .pipe(z.number().positive("Quantidade deve ser positiva")),
  price: z
    .number()
    .positive("Preço deve ser positivo")
    .or(z.string().transform((v) => parseFloat(v)))
    .pipe(z.number().positive("Preço deve ser positivo")),
  assetId: z.string().min(1, "Asset é obrigatório"),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
