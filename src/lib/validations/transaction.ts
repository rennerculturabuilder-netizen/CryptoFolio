import { z } from "zod";

const baseTransactionSchema = z.object({
  portfolioId: z.string(),
  timestamp: z.coerce.date(),
  venue: z.string().optional(),
  notes: z.string().optional(),
});

const buySchema = baseTransactionSchema.extend({
  type: z.literal('BUY'),
  baseAssetId: z.string(),
  baseQty: z.string().regex(/^\d+\.?\d*$/), // decimal string
  quoteAssetId: z.string(),
  quoteQty: z.string().regex(/^\d+\.?\d*$/),
  price: z.string().regex(/^\d+\.?\d*$/).optional(),
  feeAssetId: z.string().optional(),
  feeQty: z.string().regex(/^\d+\.?\d*$/).optional(),
});

const sellSchema = buySchema.extend({ type: z.literal('SELL') });

const swapSchema = baseTransactionSchema.extend({
  type: z.literal('SWAP'),
  baseAssetId: z.string(),
  baseQty: z.string().regex(/^\d+\.?\d*$/),
  quoteAssetId: z.string(),
  quoteQty: z.string().regex(/^\d+\.?\d*$/),
  valueUsd: z.string().regex(/^\d+\.?\d*$/).optional(),
  feeAssetId: z.string().optional(),
  feeQty: z.string().regex(/^\d+\.?\d*$/).optional(),
}).refine(
  (data) => {
    // Por hora, deixar flexível no MVP
    // Futuramente: validar valueUsd obrigatório quando quoteAsset não é stablecoin
    return true;
  },
  { message: 'valueUsd é recomendado para swaps crypto-crypto' }
);

const depositSchema = baseTransactionSchema.extend({
  type: z.literal('DEPOSIT'),
  baseAssetId: z.string(),
  baseQty: z.string().regex(/^\d+\.?\d*$/),
  costBasisUsd: z.string().regex(/^\d+\.?\d*$/).optional(),
  feeAssetId: z.string().optional(),
  feeQty: z.string().regex(/^\d+\.?\d*$/).optional(),
});

const withdrawSchema = depositSchema.extend({ type: z.literal('WITHDRAW') });

const feeSchema = baseTransactionSchema.extend({
  type: z.literal('FEE'),
  feeAssetId: z.string(),
  feeQty: z.string().regex(/^\d+\.?\d*$/),
});

export const transactionSchema = z.discriminatedUnion('type', [
  buySchema, sellSchema, swapSchema, depositSchema, withdrawSchema, feeSchema,
]);

export type TransactionInput = z.infer<typeof transactionSchema>;
