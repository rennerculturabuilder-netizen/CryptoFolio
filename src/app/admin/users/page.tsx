"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.status === 403) {
      router.push("/dashboard");
      return;
    }
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function updateRole(userId: string, newRole: string) {
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    fetchUsers();
  }

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Gerenciar Usuários</h1>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2 font-medium">Email</th>
            <th className="py-2 font-medium">Nome</th>
            <th className="py-2 font-medium">Role</th>
            <th className="py-2 font-medium text-center">Portfolios</th>
            <th className="py-2 font-medium">Criado em</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b hover:bg-gray-50">
              <td className="py-2">{user.email}</td>
              <td className="py-2 text-gray-600">{user.name || "—"}</td>
              <td className="py-2">
                <select
                  value={user.role}
                  onChange={(e) => updateRole(user.id, e.target.value)}
                  disabled={user.id === session?.user?.id}
                  className={`border rounded px-2 py-1 text-xs ${
                    user.id === session?.user?.id ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
                {user.id === session?.user?.id && (
                  <span className="text-xs text-gray-400 ml-1">(você)</span>
                )}
              </td>
              <td className="py-2 text-center">{user._count.portfolios}</td>
              <td className="py-2 text-xs text-gray-500">
                {new Date(user.createdAt).toLocaleDateString("pt-BR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
