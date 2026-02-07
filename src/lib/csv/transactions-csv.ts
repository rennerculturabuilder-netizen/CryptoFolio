import Papa from "papaparse";

type Asset = { id: string; symbol: string; name: string };

type TransactionRow = {
  id: string;
  type: string;
  timestamp: string;
  venue?: string | null;
  notes?: string | null;
  baseAsset?: Asset | null;
  baseQty?: string | null;
  quoteAsset?: Asset | null;
  quoteQty?: string | null;
  price?: string | null;
  feeAsset?: Asset | null;
  feeQty?: string | null;
  costBasisUsd?: string | null;
  valueUsd?: string | null;
};

const CSV_HEADERS = [
  "Data",
  "Tipo",
  "Base Asset",
  "Base Qty",
  "Quote Asset",
  "Quote Qty",
  "Preco",
  "Fee Asset",
  "Fee Qty",
  "Cost Basis USD",
  "Value USD",
  "Exchange",
  "Notas",
];

export function transactionsToCSV(transactions: TransactionRow[]): string {
  const rows = transactions.map((tx) => ({
    Data: tx.timestamp,
    Tipo: tx.type,
    "Base Asset": tx.baseAsset?.symbol ?? "",
    "Base Qty": tx.baseQty ?? "",
    "Quote Asset": tx.quoteAsset?.symbol ?? "",
    "Quote Qty": tx.quoteQty ?? "",
    Preco: tx.price ?? "",
    "Fee Asset": tx.feeAsset?.symbol ?? "",
    "Fee Qty": tx.feeQty ?? "",
    "Cost Basis USD": tx.costBasisUsd ?? "",
    "Value USD": tx.valueUsd ?? "",
    Exchange: tx.venue ?? "",
    Notas: tx.notes ?? "",
  }));

  return Papa.unparse(rows, { columns: CSV_HEADERS });
}

export type CSVImportRow = {
  Data: string;
  Tipo: string;
  "Base Asset": string;
  "Base Qty": string;
  "Quote Asset": string;
  "Quote Qty": string;
  Preco: string;
  "Fee Asset": string;
  "Fee Qty": string;
  "Cost Basis USD": string;
  "Value USD": string;
  Exchange: string;
  Notas: string;
};

export type ParsedTransaction = {
  row: number;
  type: string;
  timestamp: Date;
  baseSymbol: string;
  baseQty: string;
  quoteSymbol: string;
  quoteQty: string;
  price: string;
  feeSymbol: string;
  feeQty: string;
  costBasisUsd: string;
  valueUsd: string;
  venue: string;
  notes: string;
};

export type ImportValidationResult = {
  valid: ParsedTransaction[];
  errors: { row: number; message: string }[];
};

const VALID_TYPES = ["BUY", "SELL", "SWAP", "DEPOSIT", "WITHDRAW", "FEE"];

export function parseCSV(csvString: string): ImportValidationResult {
  const parsed = Papa.parse<CSVImportRow>(csvString, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const valid: ParsedTransaction[] = [];
  const errors: { row: number; message: string }[] = [];

  if (parsed.errors.length > 0) {
    parsed.errors.forEach((e) => {
      errors.push({ row: (e.row ?? 0) + 2, message: e.message });
    });
  }

  parsed.data.forEach((row, idx) => {
    const rowNum = idx + 2; // header = 1
    const type = (row.Tipo ?? "").trim().toUpperCase();

    if (!type) {
      errors.push({ row: rowNum, message: "Tipo é obrigatório" });
      return;
    }
    if (!VALID_TYPES.includes(type)) {
      errors.push({ row: rowNum, message: `Tipo inválido: ${type}` });
      return;
    }

    const dateStr = (row.Data ?? "").trim();
    if (!dateStr) {
      errors.push({ row: rowNum, message: "Data é obrigatória" });
      return;
    }
    const timestamp = new Date(dateStr);
    if (isNaN(timestamp.getTime())) {
      errors.push({ row: rowNum, message: `Data inválida: ${dateStr}` });
      return;
    }

    const baseSymbol = (row["Base Asset"] ?? "").trim().toUpperCase();
    const baseQty = (row["Base Qty"] ?? "").trim();
    const quoteSymbol = (row["Quote Asset"] ?? "").trim().toUpperCase();
    const quoteQty = (row["Quote Qty"] ?? "").trim();
    const price = (row["Preco"] ?? "").trim();
    const feeSymbol = (row["Fee Asset"] ?? "").trim().toUpperCase();
    const feeQty = (row["Fee Qty"] ?? "").trim();
    const costBasisUsd = (row["Cost Basis USD"] ?? "").trim();
    const valueUsd = (row["Value USD"] ?? "").trim();
    const venue = (row.Exchange ?? "").trim();
    const notes = (row.Notas ?? "").trim();

    // Validar campos obrigatórios por tipo
    if (type === "FEE") {
      if (!feeSymbol) {
        errors.push({ row: rowNum, message: "Fee Asset obrigatório para FEE" });
        return;
      }
      if (!feeQty || isNaN(Number(feeQty)) || Number(feeQty) <= 0) {
        errors.push({ row: rowNum, message: "Fee Qty inválido para FEE" });
        return;
      }
    } else {
      if (!baseSymbol) {
        errors.push({ row: rowNum, message: "Base Asset obrigatório" });
        return;
      }
      if (!baseQty || isNaN(Number(baseQty)) || Number(baseQty) <= 0) {
        errors.push({ row: rowNum, message: `Base Qty inválido: ${baseQty}` });
        return;
      }

      if (["BUY", "SELL", "SWAP"].includes(type)) {
        if (!quoteSymbol) {
          errors.push({ row: rowNum, message: `Quote Asset obrigatório para ${type}` });
          return;
        }
        if (!quoteQty || isNaN(Number(quoteQty)) || Number(quoteQty) <= 0) {
          errors.push({ row: rowNum, message: `Quote Qty inválido: ${quoteQty}` });
          return;
        }
      }
    }

    // Validar campos numéricos opcionais
    if (price && isNaN(Number(price))) {
      errors.push({ row: rowNum, message: `Preço inválido: ${price}` });
      return;
    }
    if (feeQty && isNaN(Number(feeQty))) {
      errors.push({ row: rowNum, message: `Fee Qty inválido: ${feeQty}` });
      return;
    }
    if (costBasisUsd && isNaN(Number(costBasisUsd))) {
      errors.push({ row: rowNum, message: `Cost Basis USD inválido: ${costBasisUsd}` });
      return;
    }
    if (valueUsd && isNaN(Number(valueUsd))) {
      errors.push({ row: rowNum, message: `Value USD inválido: ${valueUsd}` });
      return;
    }

    valid.push({
      row: rowNum,
      type,
      timestamp,
      baseSymbol,
      baseQty,
      quoteSymbol,
      quoteQty,
      price,
      feeSymbol,
      feeQty,
      costBasisUsd,
      valueUsd,
      venue,
      notes,
    });
  });

  return { valid, errors };
}
