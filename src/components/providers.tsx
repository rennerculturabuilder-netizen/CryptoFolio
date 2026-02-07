"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { PortfolioProvider } from "@/lib/hooks/use-portfolio";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
          },
          mutations: {
            onError: (error: Error) => {
              if (!error.message.includes("Erro")) {
                toast.error("Ocorreu um erro inesperado");
              }
            },
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <PortfolioProvider>
            {children}
            <Toaster />
          </PortfolioProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
