"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";

export type Portfolio = {
  id: string;
  name: string;
  baseFiat: string;
  ownerId: string;
  createdAt: string;
};

type PortfolioContextType = {
  portfolios: Portfolio[];
  selectedId: string | null;
  selected: Portfolio | null;
  setSelectedId: (id: string | null) => void;
  isLoading: boolean;
  refetch: () => void;
};

const PortfolioContext = createContext<PortfolioContextType | null>(null);

async function fetchPortfolios(): Promise<Portfolio[]> {
  const res = await fetch("/api/portfolios");
  if (!res.ok) return [];
  return res.json();
}

const STORAGE_KEY = "crypto-portfolio-selected";

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const { data: portfolios = [], isLoading, refetch } = useQuery({
    queryKey: ["portfolios"],
    queryFn: fetchPortfolios,
  });

  // Hidratar do localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSelectedIdState(stored);
    setHydrated(true);
  }, []);

  // Auto-selecionar primeiro portfolio se nenhum está selecionado
  useEffect(() => {
    if (!hydrated || isLoading) return;
    if (portfolios.length > 0 && !selectedId) {
      setSelectedIdState(portfolios[0].id);
      localStorage.setItem(STORAGE_KEY, portfolios[0].id);
    }
    // Se o selecionado não existe mais, limpar
    if (selectedId && portfolios.length > 0 && !portfolios.find((p) => p.id === selectedId)) {
      setSelectedIdState(portfolios[0].id);
      localStorage.setItem(STORAGE_KEY, portfolios[0].id);
    }
  }, [portfolios, selectedId, hydrated, isLoading]);

  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdState(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const selected = portfolios.find((p) => p.id === selectedId) || null;

  return (
    <PortfolioContext.Provider
      value={{ portfolios, selectedId, selected, setSelectedId, isLoading, refetch }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used within PortfolioProvider");
  return ctx;
}
