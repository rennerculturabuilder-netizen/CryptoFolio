import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const updateUserSchema = z.object({
  role: z.enum(["user", "admin"]).optional(),
  name: z.string().optional(),
});

// PATCH /api/admin/users/:id
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await req.json();
    const validated = updateUserSchema.parse(body);

    const user = await prisma.user.update({
      where: { id: params.id },
      data: validated,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });

    return apiSuccess(user);
  } catch (error) {
    return handleApiError(error, "PATCH /api/admin/users/:id");
  }
}
