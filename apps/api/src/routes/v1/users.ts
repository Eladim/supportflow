import { Router } from "express";
import { z } from "zod";
import { TicketStatus } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { serializeUser } from "../../lib/serialize.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validateBody } from "../../middlewares/validate.js";

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get("/", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
    const openStatuses: TicketStatus[] = [
      "OPEN",
      "IN_PROGRESS",
      "WAITING_ON_CUSTOMER",
    ];
    const grouped = await prisma.ticket.groupBy({
      by: ["assigneeId"],
      where: {
        assigneeId: { not: null },
        status: { in: openStatuses },
      },
      _count: { _all: true },
    });
    const workload = new Map<string, number>();
    for (const g of grouped) {
      if (g.assigneeId) workload.set(g.assigneeId, g._count._all);
    }
    res.json({
      users: users.map((u) => ({
        ...serializeUser(u),
        openTicketCount: workload.get(u.id) ?? 0,
      })),
    });
  } catch (e) {
    next(e);
  }
});

const patchMeSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

usersRouter.get("/me", async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
    });
    res.json({ user: serializeUser(user) });
  } catch (e) {
    next(e);
  }
});

usersRouter.patch(
  "/me",
  validateBody(patchMeSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof patchMeSchema>;
      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
        },
      });
      res.json({ user: serializeUser(user) });
    } catch (e) {
      next(e);
    }
  },
);

usersRouter.patch(
  "/:userId/role",
  async (req, res, next) => {
    try {
      if (req.user!.role !== "ADMIN") {
        next(new AppError(403, "FORBIDDEN", "Only admins can change roles"));
        return;
      }
      const schema = z.object({ role: z.enum(["ADMIN", "MANAGER", "AGENT"]) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        next(parsed.error);
        return;
      }
      const user = await prisma.user.update({
        where: { id: req.params.userId },
        data: { role: parsed.data.role },
      });
      res.json({ user: serializeUser(user) });
    } catch (e) {
      next(e);
    }
  },
);
