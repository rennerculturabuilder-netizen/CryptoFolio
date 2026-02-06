"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b px-6 py-3 flex justify-between items-center">
        <Link href="/dashboard" className="text-lg font-bold">
          Crypto Portfolio
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {session?.user?.name || session?.user?.email}
            {isAdmin && (
              <span className="ml-2 bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded">
                admin
              </span>
            )}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-red-600 hover:underline"
          >
            Sair
          </button>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-48 bg-white border-r min-h-[calc(100vh-57px)] p-4">
          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className={`block px-3 py-2 rounded text-sm ${
                pathname === "/dashboard" || pathname.startsWith("/dashboard/portfolio")
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Dashboard
            </Link>
            {isAdmin && (
              <Link
                href="/admin/users"
                className={`block px-3 py-2 rounded text-sm ${
                  pathname.startsWith("/admin")
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Admin
              </Link>
            )}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
