import { Router } from "express";
import { z } from "zod";
import { logActivity } from "../../lib/activity.js";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { serializeComment } from "../../lib/serialize.js";
import { emitToTicket } from "../../sockets/io-registry.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validateBody } from "../../middlewares/validate.js";

const patchSchema = z.object({
  body: z.string().min(1).max(20000),
});

export const commentItemsRouter = Router();
commentItemsRouter.use(authenticate);

commentItemsRouter.patch(
  "/:commentId",
  validateBody(patchSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.ticketComment.findUnique({
        where: { id: req.params.commentId },
      });
      if (!existing) {
        next(new AppError(404, "NOT_FOUND", "Comment not found"));
        return;
      }
      if (
        existing.authorId !== req.user!.id &&
        req.user!.role !== "ADMIN" &&
        req.user!.role !== "MANAGER"
      ) {
        next(new AppError(403, "FORBIDDEN", "Cannot edit this comment"));
        return;
      }
      const { body } = req.body as z.infer<typeof patchSchema>;
      const comment = await prisma.ticketComment.update({
        where: { id: existing.id },
        data: { body },
      });
      const serialized = serializeComment(comment);
      emitToTicket(comment.ticketId, "comment:updated", {
        ticketId: comment.ticketId,
        comment: serialized,
      });
      await logActivity(req.user!.id, comment.ticketId, "COMMENT_ADDED", {
        commentId: comment.id,
        edited: true,
      });
      res.json({ comment: serialized });
    } catch (e) {
      next(e);
    }
  },
);

commentItemsRouter.delete("/:commentId", async (req, res, next) => {
  try {
    const existing = await prisma.ticketComment.findUnique({
      where: { id: req.params.commentId },
    });
    if (!existing) {
      next(new AppError(404, "NOT_FOUND", "Comment not found"));
      return;
    }
    if (
      existing.authorId !== req.user!.id &&
      req.user!.role !== "ADMIN" &&
      req.user!.role !== "MANAGER"
    ) {
      next(new AppError(403, "FORBIDDEN", "Cannot delete this comment"));
      return;
    }
    const ticketId = existing.ticketId;
    await prisma.ticketComment.delete({ where: { id: existing.id } });
    emitToTicket(ticketId, "comment:deleted", {
      ticketId,
      commentId: existing.id,
    });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
