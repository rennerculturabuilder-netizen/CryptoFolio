"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Users, Crown, Wallet } from "lucide-react";
import { toast } from "sonner";

type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  _count: { portfolios: number };
};

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (res.status === 403) {
        router.push("/dashboard");
        return [];
      }
      if (!res.ok) throw new Error("Erro ao carregar usuários");
      return res.json();
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar role");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(`Role de ${data.email} atualizado para ${data.role}`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Stats
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const totalPortfolios = users.reduce((acc, u) => acc + u._count.portfolios, 0);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerenciamento de usuários
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass border-border/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              {isLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <p className="text-2xl font-bold">{totalUsers}</p>
              )}
              <p className="text-xs text-muted-foreground">Usuários</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-chart-purple/10 flex items-center justify-center">
              <Crown className="h-5 w-5 text-chart-purple" />
            </div>
            <div>
              {isLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <p className="text-2xl font-bold">{adminCount}</p>
              )}
              <p className="text-xs text-muted-foreground">Admins</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              {isLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <p className="text-2xl font-bold">{totalPortfolios}</p>
              )}
              <p className="text-xs text-muted-foreground">Portfolios</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="glass border-border/30">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium text-foreground">
                Nenhum usuário
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/20 hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-medium">
                      Usuário
                    </TableHead>
                    <TableHead className="text-muted-foreground font-medium">
                      Role
                    </TableHead>
                    <TableHead className="text-center text-muted-foreground font-medium">
                      Portfolios
                    </TableHead>
                    <TableHead className="text-muted-foreground font-medium hidden sm:table-cell">
                      Criado em
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const isMe = user.id === session?.user?.id;
                    return (
                      <TableRow
                        key={user.id}
                        className="border-border/15 hover:bg-accent/30 transition-colors"
                      >
                        {/* User info */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-sm font-bold shrink-0">
                              {(user.name || user.email)[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">
                                  {user.name || "Sem nome"}
                                </p>
                                {isMe && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-4 px-1 shrink-0 border-primary/30 text-primary"
                                  >
                                    você
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Role */}
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(role) =>
                              updateRoleMutation.mutate({
                                userId: user.id,
                                role,
                              })
                            }
                            disabled={isMe || updateRoleMutation.isPending}
                          >
                            <SelectTrigger className="w-28 h-8 bg-secondary/50 border-border/40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">
                                <div className="flex items-center gap-2">
                                  <Users className="h-3 w-3" />
                                  user
                                </div>
                              </SelectItem>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-3 w-3" />
                                  admin
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Portfolios */}
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className="font-mono text-xs border-border/50"
                          >
                            {user._count.portfolios}
                          </Badge>
                        </TableCell>

                        {/* Created */}
                        <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                          {new Date(user.createdAt).toLocaleDateString(
                            "pt-BR",
                            { day: "2-digit", month: "short", year: "numeric" }
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
