"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TransactionModal } from "@/components/transactions/transaction-modal";
import { usePortfolio } from "@/lib/hooks/use-portfolio";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  Shield,
  LogOut,
  TrendingUp,
  Menu,
  X,
  Plus,
  User,
  ChevronDown,
  Wallet,
  Bell,
  CheckCheck,
  ExternalLink,
} from "lucide-react";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.role === "admin";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { portfolios, selectedId, setSelectedId, selected } = usePortfolio();
  const queryClient = useQueryClient();

  // Transaction modal state
  const [txModalOpen, setTxModalOpen] = useState(false);

  // Dialog para criar portfolio rápido
  const [newPortfolioOpen, setNewPortfolioOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFiat, setNewFiat] = useState("USD");

  const createPortfolio = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, baseFiat: newFiat }),
      });
      if (!res.ok) throw new Error("Erro ao criar portfolio");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      setSelectedId(data.id);
      setNewName("");
      setNewFiat("USD");
      setNewPortfolioOpen(false);
      toast.success("Portfolio criado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar portfolio");
    },
  });

  // Alerts state
  const [alertsOpen, setAlertsOpen] = useState(false);

  const { data: alertCount } = useQuery<{ unread: number }>({
    queryKey: ["alert-count"],
    queryFn: async () => {
      const res = await fetch("/api/buy-bands/alerts/count");
      if (!res.ok) return { unread: 0 };
      return res.json();
    },
    refetchInterval: 60000, // poll every 60s
  });

  const { data: recentAlerts = [] } = useQuery<any[]>({
    queryKey: ["recent-alerts"],
    queryFn: async () => {
      const res = await fetch("/api/buy-bands/alerts?read=false&limit=5");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: alertsOpen,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/buy-bands/alerts/read-all", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-count"] });
      queryClient.invalidateQueries({ queryKey: ["recent-alerts"] });
    },
  });

  const unreadCount = alertCount?.unread || 0;

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      href: "/dashboard/transactions",
      label: "Transações",
      icon: ArrowLeftRight,
      active: pathname === "/dashboard/transactions",
    },
    ...(selectedId
      ? [
          {
            href: `/dashboard/portfolio/${selectedId}`,
            label: "Portfolio",
            icon: Wallet,
            active:
              pathname.startsWith("/dashboard/portfolio/") &&
              !pathname.includes("/transactions"),
          },
        ]
      : []),
    {
      href: "/dashboard/buy-bands",
      label: "DCA",
      icon: Target,
      active: pathname === "/dashboard/buy-bands",
    },
    ...(isAdmin
      ? [
          {
            href: "/admin/users",
            label: "Admin",
            icon: Shield,
            active: pathname.startsWith("/admin"),
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 md:px-6 gap-4">
          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-bold text-lg shrink-0"
          >
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <span className="hidden sm:inline bg-gradient-to-r from-primary to-chart-purple bg-clip-text text-transparent">
              CryptoFolio
            </span>
          </Link>

          {/* Portfolio Selector */}
          <div className="flex-1 flex items-center justify-center max-w-xs mx-auto">
            {portfolios.length > 0 ? (
              <Select
                value={selectedId || ""}
                onValueChange={(val) => {
                  if (val === "__new__") {
                    setNewPortfolioOpen(true);
                  } else {
                    setSelectedId(val);
                  }
                }}
              >
                <SelectTrigger className="h-9 bg-secondary/50 border-border/40 text-sm w-full">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Selecionar portfolio" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {portfolios.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span>{p.name}</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 px-1"
                        >
                          {p.baseFiat}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="__new__">
                    <div className="flex items-center gap-2 text-primary">
                      <Plus className="h-3.5 w-3.5" />
                      <span>Novo Portfolio</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="border-dashed border-border/50"
                onClick={() => setNewPortfolioOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Criar Portfolio
              </Button>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Nova Transação — abre modal */}
            {selectedId && (
              <>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground hidden sm:flex"
                  onClick={() => setTxModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Transação
                </Button>
                <Button
                  size="icon"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground sm:hidden h-8 w-8"
                  onClick={() => setTxModalOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Alerts Bell */}
            <DropdownMenu open={alertsOpen} onOpenChange={setAlertsOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Alertas</span>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-muted-foreground"
                      onClick={(e) => {
                        e.preventDefault();
                        markAllRead.mutate();
                      }}
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      Marcar todas
                    </Button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {recentAlerts.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Nenhum alerta novo
                  </div>
                ) : (
                  recentAlerts.map((alert: any) => (
                    <DropdownMenuItem key={alert.id} className="flex flex-col items-start gap-1 py-2">
                      <div className="flex items-center gap-2 w-full">
                        <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {alert.symbol} — Zone {alert.buyBand?.order ?? "?"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground pl-5">
                        {alert.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 pl-5">
                        {new Date(alert.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </DropdownMenuItem>
                  ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/buy-bands"
                    className="flex items-center justify-center gap-1 text-sm text-primary"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Ver todas
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-2 h-9"
                >
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm hidden md:inline max-w-[120px] truncate">
                    {session?.user?.name || session?.user?.email}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">
                      {session?.user?.name || "Usuário"}
                    </p>
                    <p className="text-xs text-muted-foreground font-normal">
                      {session?.user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/admin/users"
                        className="flex items-center gap-2"
                      >
                        <Shield className="h-4 w-4" />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  className="text-red-400 focus:text-red-400"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } fixed md:translate-x-0 md:static z-30 w-60 border-r border-border/30 bg-surface-1/50 backdrop-blur-xl min-h-[calc(100vh-3.5rem)] p-4 transition-transform duration-200`}
        >
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  item.active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Sidebar footer */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="rounded-lg bg-secondary/30 p-3 border border-border/20">
              <p className="text-xs text-muted-foreground">Portfolio ativo</p>
              <p className="text-sm font-medium truncate mt-0.5">
                {selected?.name || "Nenhum selecionado"}
              </p>
            </div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 max-w-[1400px] mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Transaction Modal (navbar trigger) */}
      <TransactionModal
        open={txModalOpen}
        onOpenChange={setTxModalOpen}
      />

      {/* Dialog Novo Portfolio */}
      <Dialog open={newPortfolioOpen} onOpenChange={setNewPortfolioOpen}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle>Criar Portfolio</DialogTitle>
            <DialogDescription>
              Adicione um novo portfolio para rastrear seus investimentos.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createPortfolio.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Binance Principal"
                className="bg-secondary/50 border-border/50"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Moeda base</Label>
              <Select value={newFiat} onValueChange={setNewFiat}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="BRL">BRL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={createPortfolio.isPending}
            >
              {createPortfolio.isPending ? "Criando..." : "Criar Portfolio"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
