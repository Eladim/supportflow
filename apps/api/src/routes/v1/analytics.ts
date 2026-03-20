import { Router } from "express";
import { TicketStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

export const analyticsRouter = Router();
analyticsRouter.use(authenticate);

analyticsRouter.get("/summary", async (_req, res, next) => {
  try {
    const openStatuses: TicketStatus[] = [
      "OPEN",
      "IN_PROGRESS",
      "WAITING_ON_CUSTOMER",
    ];
    const [
      openCount,
      urgentCount,
      resolvedWeek,
      totalTickets,
    ] = await prisma.$transaction([
      prisma.ticket.count({ where: { status: { in: openStatuses } } }),
      prisma.ticket.count({
        where: { priority: "URGENT", status: { in: openStatuses } },
      }),
      prisma.ticket.count({
        where: {
          status: "RESOLVED",
          updatedAt: { gte: new Date(Date.now() - 7 * 86400000) },
        },
      }),
      prisma.ticket.count(),
    ]);
    res.json({
      openTickets: openCount,
      urgentOpenTickets: urgentCount,
      resolvedLast7Days: resolvedWeek,
      totalTickets,
    });
  } catch (e) {
    next(e);
  }
});

analyticsRouter.get("/by-status", async (_req, res, next) => {
  try {
    const grouped = await prisma.ticket.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    res.json({
      byStatus: grouped.map((g) => ({
        status: g.status,
        count: g._count._all,
      })),
    });
  } catch (e) {
    next(e);
  }
});

analyticsRouter.get("/by-priority", async (_req, res, next) => {
  try {
    const grouped = await prisma.ticket.groupBy({
      by: ["priority"],
      _count: { _all: true },
    });
    res.json({
      byPriority: grouped.map((g) => ({
        priority: g.priority,
        count: g._count._all,
      })),
    });
  } catch (e) {
    next(e);
  }
});

analyticsRouter.get("/agent-workload", async (_req, res, next) => {
  try {
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
    const users = await prisma.user.findMany({
      where: {
        id: { in: grouped.map((g) => g.assigneeId).filter(Boolean) as string[] },
      },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    res.json({
      agents: grouped.map((g) => ({
        assigneeId: g.assigneeId,
        name: g.assigneeId ? userMap.get(g.assigneeId)?.name ?? "Unknown" : null,
        openAssigned: g._count._all,
      })),
    });
  } catch (e) {
    next(e);
  }
});

analyticsRouter.get("/weekly-activity", async (_req, res, next) => {
  try {
    const days: { date: string; created: number; resolved: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const [created, resolved] = await prisma.$transaction([
        prisma.ticket.count({
          where: { createdAt: { gte: start, lt: end } },
        }),
        prisma.ticket.count({
          where: {
            status: "RESOLVED",
            updatedAt: { gte: start, lt: end },
          },
        }),
      ]);
      days.push({
        date: start.toISOString().slice(0, 10),
        created,
        resolved,
      });
    }
    res.json({ days });
  } catch (e) {
    next(e);
  }
});
