"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Snapshot = {
  id: string;
  timestamp: string;
  valueUsd: string;
  costBasisUsd: string;
  unrealizedPnl: string;
  unrealizedPct: string;
  positionsSnapshot: any[];
};

type Portfolio = { id: string; name: string };

export default function HistoryPage() {
  const { id } = useParams<{ id: string }>();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [p, snaps] = await Promise.all([
          fetch(`/api/portfolios/${id}`).then((r) => r.json()),
          fetch(`/api/portfolios/${id}/snapshots?limit=${days}`).then((r) => r.json()),
        ]);
        setPortfolio(p);
        setSnapshots(Array.isArray(snaps) ? snaps : []);
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, [id, days]);

  async function createSnapshot() {
    setCreating(true);
    try {
      const res = await fetch(`/api/portfolios/${id}/snapshots`, { method: "POST" });
      if (res.ok) {
        const snap = await res.json();
        setSnapshots((prev) => [snap, ...prev]);
      }
    } catch {
      // ignore
    }
    setCreating(false);
  }

  if (loading) return <p className="text-gray-500">Carregando...</p>;
  if (!portfolio) return <p className="text-red-500">Portfolio não encontrado</p>;

  // Ordenar por data crescente para o gráfico
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const chartData = sorted.map((s) => ({
    date: new Date(s.timestamp).toLocaleDateString("pt-BR"),
    valor: parseFloat(s.valueUsd),
    custo: parseFloat(s.costBasisUsd),
    pnl: parseFloat(s.unrealizedPnl),
  }));

  const latest = snapshots[0];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/portfolio/${id}`} className="text-blue-600 hover:underline text-sm">
          &larr; Voltar
        </Link>
        <h1 className="text-xl font-bold">{portfolio.name} — Histórico</h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={createSnapshot}
          disabled={creating}
          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? "Criando..." : "Criar Snapshot Agora"}
        </button>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="border rounded px-2 py-1.5 text-sm"
        >
          <option value={7}>7 dias</option>
          <option value={30}>30 dias</option>
          <option value={90}>90 dias</option>
          <option value={365}>365 dias</option>
        </select>
        <span className="text-sm text-gray-500">{snapshots.length} snapshots</span>
      </div>

      {/* Summary Card */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border rounded p-3">
            <div className="text-xs text-gray-500">Valor Atual</div>
            <div className="text-lg font-bold font-mono">
              ${parseFloat(latest.valueUsd).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white border rounded p-3">
            <div className="text-xs text-gray-500">Custo Base</div>
            <div className="text-lg font-bold font-mono">
              ${parseFloat(latest.costBasisUsd).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white border rounded p-3">
            <div className="text-xs text-gray-500">P&L Não Realizado</div>
            <div className={`text-lg font-bold font-mono ${parseFloat(latest.unrealizedPnl) >= 0 ? "text-green-600" : "text-red-600"}`}>
              ${parseFloat(latest.unrealizedPnl).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white border rounded p-3">
            <div className="text-xs text-gray-500">P&L %</div>
            <div className={`text-lg font-bold font-mono ${parseFloat(latest.unrealizedPct) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {parseFloat(latest.unrealizedPct).toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length >= 2 ? (
        <div className="bg-white border rounded p-4 mb-6">
          <h2 className="text-sm font-medium mb-3">Evolução do Portfolio</h2>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
              <Tooltip
                formatter={(value) => `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              />
              <Legend />
              <Line type="monotone" dataKey="valor" name="Valor (USD)" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="custo" name="Custo Base" stroke="#9ca3af" strokeWidth={1} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="pnl" name="P&L" stroke="#16a34a" strokeWidth={1} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-gray-50 border rounded p-8 text-center mb-6">
          <p className="text-gray-500 text-sm">
            {chartData.length === 0
              ? "Nenhum snapshot encontrado. Crie um snapshot para começar."
              : "Pelo menos 2 snapshots necessários para gerar o gráfico."}
          </p>
        </div>
      )}

      {/* Snapshots Table */}
      {snapshots.length > 0 && (
        <div>
          <h2 className="text-sm font-medium mb-2">Snapshots</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 font-medium">Data</th>
                <th className="py-2 font-medium text-right">Valor</th>
                <th className="py-2 font-medium text-right">Custo</th>
                <th className="py-2 font-medium text-right">P&L</th>
                <th className="py-2 font-medium text-right">P&L %</th>
                <th className="py-2 font-medium text-right">Posições</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 text-xs">
                    {new Date(s.timestamp).toLocaleString("pt-BR")}
                  </td>
                  <td className="py-2 text-right font-mono">
                    ${parseFloat(s.valueUsd).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 text-right font-mono">
                    ${parseFloat(s.costBasisUsd).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`py-2 text-right font-mono ${parseFloat(s.unrealizedPnl) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    ${parseFloat(s.unrealizedPnl).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`py-2 text-right font-mono ${parseFloat(s.unrealizedPct) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {parseFloat(s.unrealizedPct).toFixed(2)}%
                  </td>
                  <td className="py-2 text-right text-xs text-gray-500">
                    {Array.isArray(s.positionsSnapshot) ? s.positionsSnapshot.length : 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
