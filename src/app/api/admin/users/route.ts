import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { apiSuccess, handleApiError } from "@/lib/api-response";

// GET /api/admin/users
export async function GET() {
  try {
    await requireAdmin();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { portfolios: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(users);
  } catch (error) {
    return handleApiError(error, "GET /api/admin/users");
  }
}
