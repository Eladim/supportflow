import fs from "node:fs/promises";
import path from "node:path";
import { createReadStream } from "node:fs";
import { Router } from "express";
import multer from "multer";
import { nanoid } from "nanoid";
import { z } from "zod";
import { loadEnv } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { serializeAttachment } from "../../lib/serialize.js";
import { emitToTicket } from "../../sockets/io-registry.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

async function ensureUploadDir(): Promise<string> {
  const dir = loadEnv().UPLOAD_DIR;
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    void ensureUploadDir()
      .then((d) => cb(null, d))
      .catch((err: Error) => cb(err, ""));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, `${nanoid(24)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

export const uploadsRouter = Router();

uploadsRouter.post(
  "/uploads",
  authenticate,
  upload.single("file"),
  async (req, res, next) => {
    try {
      const ticketId = z.string().uuid().parse(req.body.ticketId);
      if (!req.file) {
        next(new AppError(400, "NO_FILE", "File required"));
        return;
      }
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) {
        await fs.unlink(req.file.path).catch(() => {});
        next(new AppError(404, "NOT_FOUND", "Ticket not found"));
        return;
      }
      const att = await prisma.attachment.create({
        data: {
          ticketId,
          uploadedById: req.user!.id,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
          storageKey: req.file.filename,
        },
      });
      await prisma.activityLog.create({
        data: {
          actorId: req.user!.id,
          ticketId,
          action: "ATTACHMENT_ADDED",
          metadata: { attachmentId: att.id },
        },
      });
      const serialized = serializeAttachment(att);
      emitToTicket(ticketId, "ticket:updated", {
        ticketId,
        attachment: serialized,
      });
      res.status(201).json({ attachment: serialized });
    } catch (e) {
      next(e);
    }
  },
);

uploadsRouter.get(
  "/attachments/:attachmentId/download",
  authenticate,
  async (req, res, next) => {
    try {
      const att = await prisma.attachment.findUnique({
        where: { id: req.params.attachmentId },
      });
      if (!att) {
        next(new AppError(404, "NOT_FOUND", "Attachment not found"));
        return;
      }
      const dir = await ensureUploadDir();
      const filePath = path.join(dir, att.storageKey);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(att.originalName)}"`,
      );
      res.setHeader("Content-Type", att.mimeType);
      createReadStream(filePath).pipe(res);
    } catch (e) {
      next(e);
    }
  },
);
