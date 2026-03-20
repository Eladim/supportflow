import type { Server as IOServer } from "socket.io";

let io: IOServer | null = null;

export function setIo(server: IOServer): void {
  io = server;
}

export function getIo(): IOServer | null {
  return io;
}

export function emitToTicket(ticketId: string, event: string, payload: unknown): void {
  io?.to(`ticket:${ticketId}`).emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitPresence(userId: string, lastSeenAt: string): void {
  io?.emit("presence:update", { userId, lastSeenAt });
}
