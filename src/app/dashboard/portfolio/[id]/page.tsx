"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Asset = { id: string; symbol: string; name: string };
type Position = { assetId: string; symbol: string; name: string; balance: string; totalCost: string; wac: string };
type Transaction = {
  id: string; type: string; timestamp: string; venue?: string; notes?: string;
  baseAsset?: Asset | null; baseQty?: string;
  quoteAsset?: Asset | null; quoteQty?: string;
  price?: string; feeAsset?: Asset | null; feeQty?: string;
  costBasisUsd?: string; valueUsd?: string;
};
type BuyBand = {
  id: string; targetPrice: string; quantity: string; executed: boolean;
  order: number; asset: Asset;
};
type Portfolio = { id: string; name: string; baseFiat: string };

const TX_TYPES = ["BUY", "SELL", "SWAP", "DEPOSIT", "WITHDRAW", "FEE"] as const;

export default function PortfolioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [buyBands, setBuyBands] = useState<BuyBand[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"positions" | "transactions" | "buyBands">("positions");

  const fetchAll = useCallback(async () => {
    try {
      const [p, pos, txs, bands, a] = await Promise.all([
        fetch(`/api/portfolios/${id}`).then((r) => r.json()),
        fetch(`/api/portfolios/${id}/wac`).then((r) => r.json()),
        fetch(`/api/portfolios/${id}/transactions`).then((r) => r.json()),
        fetch(`/api/portfolios/${id}/buy-bands`).then((r) => r.json()),
        fetch("/api/assets").then((r) => r.json()),
      ]);
      setPortfolio(p);
      setPositions(Array.isArray(pos) ? pos : []);
      setTransactions(Array.isArray(txs) ? txs : []);
      setBuyBands(Array.isArray(bands) ? bands : []);
      setAssets(Array.isArray(a) ? a : []);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <p className="text-gray-500">Carregando...</p>;
  if (!portfolio) return <p className="text-red-500">Portfolio não encontrado</p>;

  const totalCost = positions.reduce((acc, p) => acc + parseFloat(p.totalCost || "0"), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">&larr; Voltar</Link>
        <h1 className="text-xl font-bold">{portfolio.name}</h1>
        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{portfolio.baseFiat}</span>
        <Link
          href={`/dashboard/portfolio/${id}/history`}
          className="text-blue-600 hover:underline text-sm"
        >
          Histórico
        </Link>
        <span className="ml-auto text-sm font-medium">
          Custo total: ${totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b">
        {(["positions", "transactions", "buyBands"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px ${
              tab === t ? "border-blue-600 text-blue-700 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "positions" ? "Posições" : t === "transactions" ? "Transações" : "Buy Bands"}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "positions" && <PositionsTab positions={positions} />}
      {tab === "transactions" && (
        <TransactionsTab
          portfolioId={id}
          transactions={transactions}
          assets={assets}
          onRefresh={fetchAll}
        />
      )}
      {tab === "buyBands" && (
        <BuyBandsTab
          portfolioId={id}
          buyBands={buyBands}
          assets={assets}
          onRefresh={fetchAll}
        />
      )}
    </div>
  );
}

/* ==================== POSITIONS TAB ==================== */
function PositionsTab({ positions }: { positions: Position[] }) {
  const active = positions.filter((p) => parseFloat(p.balance) > 0);

  if (active.length === 0) {
    return <p className="text-gray-500 text-sm py-4">Nenhuma posição aberta. Adicione transações.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-gray-500">
          <th className="py-2 font-medium">Asset</th>
          <th className="py-2 font-medium text-right">Saldo</th>
          <th className="py-2 font-medium text-right">Custo Médio</th>
          <th className="py-2 font-medium text-right">Custo Total</th>
        </tr>
      </thead>
      <tbody>
        {active.map((p) => (
          <tr key={p.assetId} className="border-b">
            <td className="py-2">
              <span className="font-medium">{p.symbol}</span>
              <span className="text-gray-400 ml-1 text-xs">{p.name}</span>
            </td>
            <td className="py-2 text-right font-mono">{parseFloat(p.balance).toFixed(6)}</td>
            <td className="py-2 text-right font-mono">${parseFloat(p.wac).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
            <td className="py-2 text-right font-mono">${parseFloat(p.totalCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ==================== TRANSACTIONS TAB ==================== */
function TransactionsTab({
  portfolioId, transactions, assets, onRefresh,
}: {
  portfolioId: string; transactions: Transaction[]; assets: Asset[]; onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-500">{transactions.length} transações</span>
        <button
          onClick={() => { setShowForm(!showForm); setEditId(null); }}
          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
        >
          + Nova Transação
        </button>
      </div>

      {(showForm || editId) && (
        <TransactionForm
          portfolioId={portfolioId}
          assets={assets}
          editTx={editId ? transactions.find((t) => t.id === editId) : undefined}
          onDone={() => { setShowForm(false); setEditId(null); onRefresh(); }}
          onCancel={() => { setShowForm(false); setEditId(null); }}
        />
      )}

      {transactions.length === 0 ? (
        <p className="text-gray-500 text-sm py-4">Nenhuma transação.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 font-medium">Data</th>
              <th className="py-2 font-medium">Tipo</th>
              <th className="py-2 font-medium">Detalhes</th>
              <th className="py-2 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b hover:bg-gray-50">
                <td className="py-2 text-xs text-gray-500">
                  {new Date(tx.timestamp).toLocaleDateString("pt-BR")}
                </td>
                <td className="py-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    tx.type === "BUY" ? "bg-green-100 text-green-700" :
                    tx.type === "SELL" ? "bg-red-100 text-red-700" :
                    tx.type === "SWAP" ? "bg-purple-100 text-purple-700" :
                    tx.type === "DEPOSIT" ? "bg-blue-100 text-blue-700" :
                    tx.type === "WITHDRAW" ? "bg-orange-100 text-orange-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {tx.type}
                  </span>
                </td>
                <td className="py-2 text-xs">
                  {formatTxDetails(tx)}
                </td>
                <td className="py-2 text-right space-x-2">
                  <button
                    onClick={() => { setEditId(tx.id); setShowForm(false); }}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Editar
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("Deletar transação?")) return;
                      await fetch(`/api/portfolios/${portfolioId}/transactions/${tx.id}`, { method: "DELETE" });
                      onRefresh();
                    }}
                    className="text-red-600 hover:underline text-xs"
                  >
                    Deletar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function formatTxDetails(tx: Transaction): string {
  const base = tx.baseAsset?.symbol || "";
  const quote = tx.quoteAsset?.symbol || "";
  const bq = tx.baseQty ? parseFloat(tx.baseQty).toFixed(6) : "";
  const qq = tx.quoteQty ? parseFloat(tx.quoteQty).toFixed(2) : "";
  const fee = tx.feeAsset && tx.feeQty ? ` (fee: ${parseFloat(tx.feeQty).toFixed(6)} ${tx.feeAsset.symbol})` : "";

  switch (tx.type) {
    case "BUY": return `${bq} ${base} por ${qq} ${quote}${fee}`;
    case "SELL": return `${bq} ${base} por ${qq} ${quote}${fee}`;
    case "SWAP": return `${bq} ${base} → ${qq} ${quote}${fee}`;
    case "DEPOSIT": return `+${bq} ${base}${tx.costBasisUsd ? ` ($${parseFloat(tx.costBasisUsd).toFixed(2)})` : ""}${fee}`;
    case "WITHDRAW": return `-${bq} ${base}${fee}`;
    case "FEE": return `${tx.feeQty ? parseFloat(tx.feeQty).toFixed(6) : ""} ${tx.feeAsset?.symbol || ""}`;
    default: return "";
  }
}

/* ==================== TRANSACTION FORM ==================== */
function TransactionForm({
  portfolioId, assets, editTx, onDone, onCancel,
}: {
  portfolioId: string; assets: Asset[];
  editTx?: Transaction; onDone: () => void; onCancel: () => void;
}) {
  const [type, setType] = useState(editTx?.type || "BUY");
  const [baseAssetId, setBaseAssetId] = useState(editTx?.baseAsset?.id || "");
  const [baseQty, setBaseQty] = useState(editTx?.baseQty || "");
  const [quoteAssetId, setQuoteAssetId] = useState(editTx?.quoteAsset?.id || "");
  const [quoteQty, setQuoteQty] = useState(editTx?.quoteQty || "");
  const [price, setPrice] = useState(editTx?.price || "");
  const [feeAssetId, setFeeAssetId] = useState(editTx?.feeAsset?.id || "");
  const [feeQty, setFeeQty] = useState(editTx?.feeQty || "");
  const [costBasisUsd, setCostBasisUsd] = useState(editTx?.costBasisUsd || "");
  const [valueUsd, setValueUsd] = useState(editTx?.valueUsd || "");
  const [timestamp, setTimestamp] = useState(
    editTx ? new Date(editTx.timestamp).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
  );
  const [venue, setVenue] = useState(editTx?.venue || "");
  const [notes, setNotes] = useState(editTx?.notes || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const needsBase = ["BUY", "SELL", "SWAP", "DEPOSIT", "WITHDRAW"].includes(type);
  const needsQuote = ["BUY", "SELL", "SWAP"].includes(type);
  const needsCostBasis = ["DEPOSIT", "WITHDRAW"].includes(type);
  const needsValueUsd = type === "SWAP";
  const isFeeOnly = type === "FEE";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const body: Record<string, unknown> = {
      type,
      timestamp: new Date(timestamp).toISOString(),
      venue: venue || undefined,
      notes: notes || undefined,
    };

    if (needsBase) {
      body.baseAssetId = baseAssetId;
      body.baseQty = baseQty;
    }
    if (needsQuote) {
      body.quoteAssetId = quoteAssetId;
      body.quoteQty = quoteQty;
      if (price) body.price = price;
    }
    if (needsCostBasis && costBasisUsd) body.costBasisUsd = costBasisUsd;
    if (needsValueUsd && valueUsd) body.valueUsd = valueUsd;
    if (isFeeOnly) {
      body.feeAssetId = feeAssetId;
      body.feeQty = feeQty;
    } else if (feeAssetId && feeQty) {
      body.feeAssetId = feeAssetId;
      body.feeQty = feeQty;
    }

    try {
      const url = editTx
        ? `/api/transactions/${editTx.id}`
        : `/api/portfolios/${portfolioId}/transactions`;
      const method = editTx ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao salvar");
        setSaving(false);
        return;
      }
      onDone();
    } catch {
      setError("Erro de conexão");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded p-4 mb-4 space-y-3">
      <h3 className="font-medium text-sm">{editTx ? "Editar Transação" : "Nova Transação"}</h3>

      {error && <div className="bg-red-50 text-red-600 p-2 rounded text-xs">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Type */}
        {!editTx && (
          <div>
            <label className="block text-xs font-medium mb-1">Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
              {TX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}

        {/* Timestamp */}
        <div>
          <label className="block text-xs font-medium mb-1">Data/Hora</label>
          <input type="datetime-local" value={timestamp} onChange={(e) => setTimestamp(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm" required />
        </div>

        {/* Base Asset */}
        {needsBase && (
          <>
            <div>
              <label className="block text-xs font-medium mb-1">Asset{type === "BUY" ? " (compra)" : type === "SELL" ? " (venda)" : ""}</label>
              <select value={baseAssetId} onChange={(e) => setBaseAssetId(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" required>
                <option value="">Selecionar...</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.symbol}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Quantidade</label>
              <input type="text" value={baseQty} onChange={(e) => setBaseQty(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" placeholder="0.00" required />
            </div>
          </>
        )}

        {/* Quote Asset */}
        {needsQuote && (
          <>
            <div>
              <label className="block text-xs font-medium mb-1">{type === "SWAP" ? "Asset recebido" : "Pago com"}</label>
              <select value={quoteAssetId} onChange={(e) => setQuoteAssetId(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" required>
                <option value="">Selecionar...</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.symbol}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">{type === "SWAP" ? "Qty recebida" : "Valor pago"}</label>
              <input type="text" value={quoteQty} onChange={(e) => setQuoteQty(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" placeholder="0.00" required />
            </div>
          </>
        )}

        {/* Price (BUY/SELL) */}
        {needsQuote && type !== "SWAP" && (
          <div>
            <label className="block text-xs font-medium mb-1">Preço unitário (opc.)</label>
            <input type="text" value={price} onChange={(e) => setPrice(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm" placeholder="0.00" />
          </div>
        )}

        {/* valueUsd (SWAP) */}
        {needsValueUsd && (
          <div>
            <label className="block text-xs font-medium mb-1">Valor USD do swap</label>
            <input type="text" value={valueUsd} onChange={(e) => setValueUsd(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm" placeholder="Para crypto-crypto" />
          </div>
        )}

        {/* costBasisUsd (DEPOSIT/WITHDRAW) */}
        {needsCostBasis && (
          <div>
            <label className="block text-xs font-medium mb-1">Cost Basis USD (opc.)</label>
            <input type="text" value={costBasisUsd} onChange={(e) => setCostBasisUsd(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm" placeholder="0.00" />
          </div>
        )}

        {/* Fee Only */}
        {isFeeOnly && (
          <>
            <div>
              <label className="block text-xs font-medium mb-1">Fee Asset</label>
              <select value={feeAssetId} onChange={(e) => setFeeAssetId(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" required>
                <option value="">Selecionar...</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.symbol}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Fee Qty</label>
              <input type="text" value={feeQty} onChange={(e) => setFeeQty(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" placeholder="0.00" required />
            </div>
          </>
        )}

        {/* Fee (optional on other types) */}
        {!isFeeOnly && (
          <>
            <div>
              <label className="block text-xs font-medium mb-1">Fee Asset (opc.)</label>
              <select value={feeAssetId} onChange={(e) => setFeeAssetId(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="">Sem fee</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.symbol}</option>)}
              </select>
            </div>
            {feeAssetId && (
              <div>
                <label className="block text-xs font-medium mb-1">Fee Qty</label>
                <input type="text" value={feeQty} onChange={(e) => setFeeQty(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm" placeholder="0.00" />
              </div>
            )}
          </>
        )}

        {/* Venue */}
        <div>
          <label className="block text-xs font-medium mb-1">Exchange (opc.)</label>
          <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm" placeholder="Binance, Coinbase..." />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium mb-1">Notas (opc.)</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm" />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving}
          className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50">
          {saving ? "Salvando..." : editTx ? "Salvar" : "Criar"}
        </button>
        <button type="button" onClick={onCancel}
          className="text-gray-500 px-3 py-1.5 text-sm hover:text-gray-700">
          Cancelar
        </button>
      </div>
    </form>
  );
}

/* ==================== BUY BANDS TAB ==================== */
function BuyBandsTab({
  portfolioId, buyBands, assets, onRefresh,
}: {
  portfolioId: string; buyBands: BuyBand[]; assets: Asset[]; onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [assetId, setAssetId] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [order, setOrder] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const res = await fetch(`/api/portfolios/${portfolioId}/buy-bands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId,
        targetPrice,
        quantity,
        order: parseInt(order),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erro ao criar");
      setSaving(false);
      return;
    }

    setShowForm(false);
    setAssetId("");
    setTargetPrice("");
    setQuantity("");
    setOrder("0");
    setSaving(false);
    onRefresh();
  }

  async function toggleExecuted(band: BuyBand) {
    await fetch(`/api/buy-bands/${band.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ executed: !band.executed }),
    });
    onRefresh();
  }

  async function deleteBand(bandId: string) {
    if (!confirm("Deletar buy band?")) return;
    await fetch(`/api/buy-bands/${bandId}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-500">{buyBands.length} buy bands</span>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
        >
          + Nova Band
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border rounded p-4 mb-4 space-y-3">
          {error && <div className="bg-red-50 text-red-600 p-2 rounded text-xs">{error}</div>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Asset</label>
              <select value={assetId} onChange={(e) => setAssetId(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" required>
                <option value="">Selecionar...</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.symbol}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Preço alvo</label>
              <input type="text" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" placeholder="50000" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Quantidade</label>
              <input type="text" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" placeholder="0.1" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Order</label>
              <input type="number" value={order} onChange={(e) => setOrder(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" min="0" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50">
              {saving ? "Criando..." : "Criar"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="text-gray-500 px-3 py-1.5 text-sm">Cancelar</button>
          </div>
        </form>
      )}

      {buyBands.length === 0 ? (
        <p className="text-gray-500 text-sm py-4">Nenhuma buy band configurada.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 font-medium">Asset</th>
              <th className="py-2 font-medium text-right">Preço Alvo</th>
              <th className="py-2 font-medium text-right">Quantidade</th>
              <th className="py-2 font-medium text-center">Order</th>
              <th className="py-2 font-medium text-center">Status</th>
              <th className="py-2 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {buyBands.map((band) => (
              <tr key={band.id} className="border-b hover:bg-gray-50">
                <td className="py-2 font-medium">{band.asset.symbol}</td>
                <td className="py-2 text-right font-mono">
                  ${parseFloat(band.targetPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </td>
                <td className="py-2 text-right font-mono">{parseFloat(band.quantity).toFixed(6)}</td>
                <td className="py-2 text-center">{band.order}</td>
                <td className="py-2 text-center">
                  <button
                    onClick={() => toggleExecuted(band)}
                    className={`text-xs px-2 py-0.5 rounded ${
                      band.executed ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {band.executed ? "Executada" : "Pendente"}
                  </button>
                </td>
                <td className="py-2 text-right">
                  <button onClick={() => deleteBand(band.id)}
                    className="text-red-600 hover:underline text-xs">
                    Deletar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
