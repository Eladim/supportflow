import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { serializeNotification } from "../../lib/serialize.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
const listQuery = z.object({
  unreadOnly: z.preprocess(
    (v) => (Array.isArray(v) ? v[0] : v),
    z
      .string()
      .optional()
      .transform((val) => val === "true"),
  ),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

notificationsRouter.get("/", async (req, res, next) => {
  try {
    const q = listQuery.parse(req.query);
    const where = {
      userId: req.user!.id,
      ...(q.unreadOnly ? { readAt: null } : {}),
    };
    const [total, rows] = await prisma.$transaction([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    res.json({
      notifications: rows.map(serializeNotification),
      total,
      page: q.page,
      pageSize: q.pageSize,
    });
  } catch (e) {
    next(e);
  }
});

notificationsRouter.patch("/:notificationId/read", async (req, res, next) => {
  try {
    const n = await prisma.notification.updateMany({
      where: { id: req.params.notificationId, userId: req.user!.id },
      data: { readAt: new Date() },
    });
    if (n.count === 0) {
      res.status(404).json({ code: "NOT_FOUND", message: "Notification not found" });
      return;
    }
    const updated = await prisma.notification.findUniqueOrThrow({
      where: { id: req.params.notificationId },
    });
    res.json({ notification: serializeNotification(updated) });
  } catch (e) {
    next(e);
  }
});

notificationsRouter.post("/mark-all-read", async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
