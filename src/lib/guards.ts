import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "admin") throw new Error("Forbidden");
  return session;
}

export async function requirePortfolioAccess(
  userId: string,
  portfolioId: string,
  role: string
) {
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
  });
  if (!portfolio) throw new Error("Portfolio not found");
  if (portfolio.ownerId !== userId && role !== "admin") {
    throw new Error("Forbidden");
  }
  return portfolio;
}
