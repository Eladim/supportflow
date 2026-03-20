import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { logActivity } from "../../lib/activity.js";
import { AppError } from "../../lib/errors.js";
import { notifyUser } from "../../lib/notify.js";
import { prisma } from "../../lib/prisma.js";
import {
  serializeActivity,
  serializeAttachment,
  serializeComment,
  serializeNote,
  serializeTicket,
} from "../../lib/serialize.js";
import { emitToTicket } from "../../sockets/io-registry.js";
import { authenticate, requireRoles } from "../../middlewares/auth.middleware.js";
import { validateBody } from "../../middlewares/validate.js";

const listQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).optional(),
  assigneeId: z.string().uuid().optional(),
  /** When true or 1, only tickets with no assignee. Mutually exclusive with assigneeId (unassigned wins). */
  unassigned: z.enum(["true", "1"]).optional(),
  category: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sort: z.enum(["newest", "oldest", "priority", "dueDate"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const createTicketSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(20000),
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).optional(),
  category: z.string().min(1).max(120),
  dueAt: z.string().datetime().nullable().optional(),
});

const patchTicketSchema = createTicketSchema.partial();

const assignSchema = z.object({
  assigneeId: z.string().uuid().nullable(),
});

const threadBodySchema = z.object({
  body: z.string().min(1).max(20000),
  parentId: z.string().uuid().nullable().optional(),
});

export const ticketsRouter = Router();

ticketsRouter.use(authenticate);

ticketsRouter.get("/", async (req, res, next) => {
    try {
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        next(parsed.error);
        return;
      }
      const q = parsed.data;
      const where: Prisma.TicketWhereInput = {};

      if (q.search) {
        where.OR = [
          { title: { contains: q.search, mode: "insensitive" } },
          { description: { contains: q.search, mode: "insensitive" } },
        ];
      }
      if (q.status) where.status = q.status;
      if (q.priority) where.priority = q.priority;
      if (q.unassigned === "true" || q.unassigned === "1") {
        where.assigneeId = null;
      } else if (q.assigneeId) {
        where.assigneeId = q.assigneeId;
      }
      if (q.category) where.category = q.category;
      if (q.from || q.to) {
        where.createdAt = {};
        if (q.from) where.createdAt.gte = q.from;
        if (q.to) where.createdAt.lte = q.to;
      }

      let orderBy: Prisma.TicketOrderByWithRelationInput[] = [];
      switch (q.sort) {
        case "oldest":
          orderBy = [{ createdAt: "asc" }];
          break;
        case "priority":
          orderBy = [{ priority: "asc" }, { createdAt: "desc" }];
          break;
        case "dueDate":
          orderBy = [{ dueAt: { sort: "asc", nulls: "last" } }];
          break;
        default:
          orderBy = [{ createdAt: "desc" }];
      }

      const [total, rows] = await prisma.$transaction([
        prisma.ticket.count({ where }),
        prisma.ticket.findMany({
          where,
          orderBy,
          skip: (q.page - 1) * q.pageSize,
          take: q.pageSize,
          include: {
            createdBy: true,
            assignee: true,
          },
        }),
      ]);

      res.json({
        tickets: rows.map((t) => ({
          ...serializeTicket(t),
          createdBy: {
            id: t.createdBy.id,
            name: t.createdBy.name,
            email: t.createdBy.email,
          },
          assignee: t.assignee
            ? { id: t.assignee.id, name: t.assignee.name, email: t.assignee.email }
            : null,
        })),
        total,
        page: q.page,
        pageSize: q.pageSize,
      });
    } catch (e) {
      next(e);
    }
  },
);

ticketsRouter.post(
  "/",
  validateBody(createTicketSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createTicketSchema>;
      const dueAt = body.dueAt ? new Date(body.dueAt) : null;
      const ticket = await prisma.ticket.create({
        data: {
          title: body.title,
          description: body.description,
          status: body.status ?? "OPEN",
          priority: body.priority ?? "MEDIUM",
          category: body.category,
          dueAt,
          createdById: req.user!.id,
        },
      });
      await logActivity(req.user!.id, ticket.id, "TICKET_CREATED", {
        title: ticket.title,
      });
      const full = serializeTicket(ticket);
      emitToTicket(ticket.id, "ticket:updated", { ticketId: ticket.id, ticket: full });
      const io = (await import("../../sockets/io-registry.js")).getIo();
      io?.emit("ticket:created", { ticket: full });
      res.status(201).json({
        ticket: {
          ...full,
          createdBy: { id: req.user!.id },
          assignee: null,
        },
      });
    } catch (e) {
      next(e);
    }
  },
);

ticketsRouter.get("/:ticketId/activity", async (req, res, next) => {
  try {
    const logs = await prisma.activityLog.findMany({
      where: { ticketId: req.params.ticketId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json({ activity: logs.map(serializeActivity) });
  } catch (e) {
    next(e);
  }
});

ticketsRouter.get("/:ticketId/comments", async (req, res, next) => {
  try {
    const comments = await prisma.ticketComment.findMany({
      where: { ticketId: req.params.ticketId },
      orderBy: { createdAt: "asc" },
    });
    res.json({ comments: comments.map(serializeComment) });
  } catch (e) {
    next(e);
  }
});

ticketsRouter.post(
  "/:ticketId/comments",
  validateBody(threadBodySchema),
  async (req, res, next) => {
    try {
      const { body, parentId } = req.body as z.infer<typeof threadBodySchema>;
      const comment = await prisma.ticketComment.create({
        data: {
          ticketId: req.params.ticketId,
          authorId: req.user!.id,
          body,
          parentId: parentId ?? null,
        },
      });
      await logActivity(req.user!.id, req.params.ticketId, "COMMENT_ADDED", {
        commentId: comment.id,
      });
      const serialized = serializeComment(comment);
      emitToTicket(req.params.ticketId, "comment:created", {
        ticketId: req.params.ticketId,
        comment: serialized,
      });
      res.status(201).json({ comment: serialized });
    } catch (e) {
      next(e);
    }
  },
);

ticketsRouter.get("/:ticketId/notes", async (req, res, next) => {
  try {
    const notes = await prisma.internalNote.findMany({
      where: { ticketId: req.params.ticketId },
      orderBy: { createdAt: "asc" },
    });
    res.json({ notes: notes.map(serializeNote) });
  } catch (e) {
    next(e);
  }
});

ticketsRouter.post(
  "/:ticketId/notes",
  validateBody(threadBodySchema),
  async (req, res, next) => {
    try {
      const { body, parentId } = req.body as z.infer<typeof threadBodySchema>;
      const note = await prisma.internalNote.create({
        data: {
          ticketId: req.params.ticketId,
          authorId: req.user!.id,
          body,
          parentId: parentId ?? null,
        },
      });
      await logActivity(req.user!.id, req.params.ticketId, "NOTE_ADDED", {
        noteId: note.id,
      });
      const serialized = serializeNote(note);
      emitToTicket(req.params.ticketId, "note:created", {
        ticketId: req.params.ticketId,
        note: serialized,
      });
      res.status(201).json({ note: serialized });
    } catch (e) {
      next(e);
    }
  },
);

ticketsRouter.get("/:ticketId", async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.ticketId },
      include: {
        createdBy: true,
        assignee: true,
        attachments: true,
      },
    });
    if (!ticket) {
      next(new AppError(404, "NOT_FOUND", "Ticket not found"));
      return;
    }
    res.json({
      ticket: {
        ...serializeTicket(ticket),
        createdBy: {
          id: ticket.createdBy.id,
          name: ticket.createdBy.name,
          email: ticket.createdBy.email,
        },
        assignee: ticket.assignee
          ? {
              id: ticket.assignee.id,
              name: ticket.assignee.name,
              email: ticket.assignee.email,
            }
          : null,
        attachments: ticket.attachments.map(serializeAttachment),
      },
    });
  } catch (e) {
    next(e);
  }
});

ticketsRouter.patch(
  "/:ticketId",
  validateBody(patchTicketSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof patchTicketSchema>;
      const existing = await prisma.ticket.findUnique({
        where: { id: req.params.ticketId },
      });
      if (!existing) {
        next(new AppError(404, "NOT_FOUND", "Ticket not found"));
        return;
      }
      const dueAt =
        body.dueAt === null
          ? null
          : body.dueAt !== undefined
            ? new Date(body.dueAt)
            : undefined;

      const ticket = await prisma.ticket.update({
        where: { id: req.params.ticketId },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
          ...(body.priority !== undefined ? { priority: body.priority } : {}),
          ...(body.category !== undefined ? { category: body.category } : {}),
          ...(dueAt !== undefined ? { dueAt } : {}),
        },
        include: { createdBy: true, assignee: true },
      });

      if (body.status !== undefined && body.status !== existing.status) {
        await logActivity(req.user!.id, ticket.id, "STATUS_CHANGED", {
          from: existing.status,
          to: body.status,
        });
      }
      if (body.priority !== undefined && body.priority !== existing.priority) {
        await logActivity(req.user!.id, ticket.id, "PRIORITY_CHANGED", {
          from: existing.priority,
          to: body.priority,
        });
      }

      await logActivity(req.user!.id, ticket.id, "TICKET_UPDATED", {});

      const payload = {
        ticketId: ticket.id,
        ticket: {
          ...serializeTicket(ticket),
          createdBy: {
            id: ticket.createdBy.id,
            name: ticket.createdBy.name,
            email: ticket.createdBy.email,
          },
          assignee: ticket.assignee
            ? {
                id: ticket.assignee.id,
                name: ticket.assignee.name,
                email: ticket.assignee.email,
              }
            : null,
        },
      };
      emitToTicket(ticket.id, "ticket:updated", payload);

      res.json({ ticket: payload.ticket });
    } catch (e) {
      next(e);
    }
  },
);

ticketsRouter.delete(
  "/:ticketId",
  requireRoles("ADMIN", "MANAGER"),
  async (req, res, next) => {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: req.params.ticketId },
      });
      if (!ticket) {
        next(new AppError(404, "NOT_FOUND", "Ticket not found"));
        return;
      }
      await prisma.ticket.delete({ where: { id: ticket.id } });
      emitToTicket(ticket.id, "ticket:deleted", { ticketId: ticket.id });
      const io = (await import("../../sockets/io-registry.js")).getIo();
      io?.emit("ticket:deleted", { ticketId: ticket.id });
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
);

ticketsRouter.patch(
  "/:ticketId/assign",
  requireRoles("ADMIN", "MANAGER"),
  validateBody(assignSchema),
  async (req, res, next) => {
    try {
      const { assigneeId } = req.body as z.infer<typeof assignSchema>;
      const existing = await prisma.ticket.findUnique({
        where: { id: req.params.ticketId },
      });
      if (!existing) {
        next(new AppError(404, "NOT_FOUND", "Ticket not found"));
        return;
      }
      if (assigneeId) {
        const u = await prisma.user.findUnique({ where: { id: assigneeId } });
        if (!u) {
          next(new AppError(400, "INVALID_ASSIGNEE", "Assignee not found"));
          return;
        }
      }
      const ticket = await prisma.ticket.update({
        where: { id: req.params.ticketId },
        data: { assigneeId },
        include: { createdBy: true, assignee: true },
      });
      await logActivity(req.user!.id, ticket.id, "ASSIGNED", {
        assigneeId,
      });
      if (assigneeId && assigneeId !== existing.assigneeId) {
        await notifyUser(assigneeId, "TICKET_ASSIGNED", "Ticket assigned to you", ticket.title, {
          ticketId: ticket.id,
        });
      }

      const payload = {
        ticketId: ticket.id,
        ticket: {
          ...serializeTicket(ticket),
          createdBy: {
            id: ticket.createdBy.id,
            name: ticket.createdBy.name,
            email: ticket.createdBy.email,
          },
          assignee: ticket.assignee
            ? {
                id: ticket.assignee.id,
                name: ticket.assignee.name,
                email: ticket.assignee.email,
              }
            : null,
        },
      };
      emitToTicket(ticket.id, "ticket:updated", payload);
      res.json({ ticket: payload.ticket });
    } catch (e) {
      next(e);
    }
  },
);
