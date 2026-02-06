import { AuthLayout } from "@/components/auth-layout";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayout>{children}</AuthLayout>;
}
