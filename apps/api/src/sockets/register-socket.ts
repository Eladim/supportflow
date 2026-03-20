import type { Server } from "socket.io";
import { loadEnv } from "../config/env.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { emitPresence } from "./io-registry.js";

export function registerSocketHandlers(io: Server): void {
  io.use((socket, next) => {
    const token =
      typeof socket.handshake.auth.token === "string"
        ? socket.handshake.auth.token
        : typeof socket.handshake.headers.authorization === "string" &&
            socket.handshake.headers.authorization.startsWith("Bearer ")
          ? socket.handshake.headers.authorization.slice("Bearer ".length).trim()
          : null;

    if (!token) {
      next(new Error("Unauthorized"));
      return;
    }
    try {
      const env = loadEnv();
      const payload = verifyAccessToken(env, token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string;
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
    emitPresence(userId, new Date().toISOString());

    await socket.join(`user:${userId}`);

    socket.on("ticket:join", ({ ticketId }: { ticketId: string }) => {
      void socket.join(`ticket:${ticketId}`);
    });

    socket.on("ticket:leave", ({ ticketId }: { ticketId: string }) => {
      void socket.leave(`ticket:${ticketId}`);
    });

    socket.on("presence:ping", async () => {
      const now = new Date();
      await prisma.user.update({
        where: { id: userId },
        data: { lastSeenAt: now },
      });
      emitPresence(userId, now.toISOString());
    });

    socket.on(
      "typing:start",
      (payload: { ticketId: string; context: "comment" | "note" }) => {
        socket.to(`ticket:${payload.ticketId}`).emit("typing:update", {
          ticketId: payload.ticketId,
          userId,
          context: payload.context,
          isTyping: true,
        });
      },
    );

    socket.on(
      "typing:stop",
      (payload: { ticketId: string; context: "comment" | "note" }) => {
        socket.to(`ticket:${payload.ticketId}`).emit("typing:update", {
          ticketId: payload.ticketId,
          userId,
          context: payload.context,
          isTyping: false,
        });
      },
    );
  });
}
