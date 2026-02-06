import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return Response.json({ error: "Forbidden: Admin only" }, { status: 403 });
  }

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

  return Response.json(user);
}
