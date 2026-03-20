import { Router } from "express";
import { z } from "zod";
import { logActivity } from "../../lib/activity.js";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { serializeNote } from "../../lib/serialize.js";
import { emitToTicket } from "../../sockets/io-registry.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validateBody } from "../../middlewares/validate.js";

const patchSchema = z.object({
  body: z.string().min(1).max(20000),
});

export const noteItemsRouter = Router();
noteItemsRouter.use(authenticate);

noteItemsRouter.patch(
  "/:noteId",
  validateBody(patchSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.internalNote.findUnique({
        where: { id: req.params.noteId },
      });
      if (!existing) {
        next(new AppError(404, "NOT_FOUND", "Note not found"));
        return;
      }
      if (
        existing.authorId !== req.user!.id &&
        req.user!.role !== "ADMIN" &&
        req.user!.role !== "MANAGER"
      ) {
        next(new AppError(403, "FORBIDDEN", "Cannot edit this note"));
        return;
      }
      const { body } = req.body as z.infer<typeof patchSchema>;
      const note = await prisma.internalNote.update({
        where: { id: existing.id },
        data: { body },
      });
      const serialized = serializeNote(note);
      emitToTicket(note.ticketId, "note:updated", {
        ticketId: note.ticketId,
        note: serialized,
      });
      await logActivity(req.user!.id, note.ticketId, "NOTE_ADDED", {
        noteId: note.id,
        edited: true,
      });
      res.json({ note: serialized });
    } catch (e) {
      next(e);
    }
  },
);

noteItemsRouter.delete("/:noteId", async (req, res, next) => {
  try {
    const existing = await prisma.internalNote.findUnique({
      where: { id: req.params.noteId },
    });
    if (!existing) {
      next(new AppError(404, "NOT_FOUND", "Note not found"));
      return;
    }
    if (
      existing.authorId !== req.user!.id &&
      req.user!.role !== "ADMIN" &&
      req.user!.role !== "MANAGER"
    ) {
      next(new AppError(403, "FORBIDDEN", "Cannot delete this note"));
      return;
    }
    const ticketId = existing.ticketId;
    await prisma.internalNote.delete({ where: { id: existing.id } });
    emitToTicket(ticketId, "note:deleted", {
      ticketId,
      noteId: existing.id,
    });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
