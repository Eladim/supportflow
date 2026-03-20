import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { serializeActivity } from "../../lib/serialize.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
const recentQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const activityFeedRouter = Router();
activityFeedRouter.use(authenticate);

activityFeedRouter.get("/recent", async (req, res, next) => {
  try {
    const { limit } = recentQuery.parse(req.query);
    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    res.json({ activity: logs.map(serializeActivity) });
  } catch (e) {
    next(e);
  }
});
