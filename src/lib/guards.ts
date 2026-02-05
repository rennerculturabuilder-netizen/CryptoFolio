import { prisma } from "./prisma";

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
