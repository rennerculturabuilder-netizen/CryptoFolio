import { AuthLayout } from "@/components/auth-layout";
import { ErrorBoundary } from "@/components/error-boundary";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthLayout>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </AuthLayout>
  );
}
