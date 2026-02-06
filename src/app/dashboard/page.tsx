"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Portfolio = {
  id: string;
  name: string;
  baseFiat: string;
  createdAt: string;
};

type PositionSummary = {
  totalCost: number;
  assetCount: number;
};

export default function DashboardPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [summaries, setSummaries] = useState<Record<string, PositionSummary>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFiat, setNewFiat] = useState("USD");
  const [creating, setCreating] = useState(false);

  const fetchPortfolios = useCallback(async () => {
    const res = await fetch("/api/portfolios");
    const data = await res.json();
    setPortfolios(data);
    setLoading(false);

    // Fetch WAC summary for each portfolio
    const sums: Record<string, PositionSummary> = {};
    await Promise.all(
      data.map(async (p: Portfolio) => {
        try {
          const wacRes = await fetch(`/api/portfolios/${p.id}/wac`);
          const positions = await wacRes.json();
          if (Array.isArray(positions)) {
            sums[p.id] = {
              totalCost: positions.reduce(
                (acc: number, pos: { totalCost?: string }) => acc + parseFloat(pos.totalCost || "0"),
                0
              ),
              assetCount: positions.filter(
                (pos: { balance?: string }) => parseFloat(pos.balance || "0") > 0
              ).length,
            };
          }
        } catch {
          sums[p.id] = { totalCost: 0, assetCount: 0 };
        }
      })
    );
    setSummaries(sums);
  }, []);

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/portfolios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, baseFiat: newFiat }),
    });
    if (res.ok) {
      setNewName("");
      setShowCreate(false);
      fetchPortfolios();
    }
    setCreating(false);
  }

  if (loading) {
    return <p className="text-gray-500">Carregando...</p>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Meus Portfolios</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          + Novo Portfolio
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white p-4 rounded border mb-6 flex gap-3 items-end"
        >
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1">Nome</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border rounded px-3 py-1.5 text-sm"
              placeholder="Ex: Binance Principal"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Moeda base</label>
            <select
              value={newFiat}
              onChange={(e) => setNewFiat(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm"
            >
              <option value="USD">USD</option>
              <option value="BRL">BRL</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50"
          >
            Criar
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            className="text-gray-500 px-3 py-1.5 text-sm hover:text-gray-700"
          >
            Cancelar
          </button>
        </form>
      )}

      {portfolios.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <p>Nenhum portfolio ainda.</p>
          <p className="text-sm">Crie seu primeiro portfolio acima.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {portfolios.map((p) => {
            const summary = summaries[p.id];
            return (
              <Link
                key={p.id}
                href={`/dashboard/portfolio/${p.id}`}
                className="bg-white p-4 rounded border hover:border-blue-300 hover:shadow-sm transition-all block"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="font-medium">{p.name}</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {p.baseFiat} &middot; Criado em{" "}
                      {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-right">
                    {summary ? (
                      <>
                        <p className="text-sm font-medium">
                          ${summary.totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {summary.assetCount} ativo{summary.assetCount !== 1 ? "s" : ""}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400">...</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
