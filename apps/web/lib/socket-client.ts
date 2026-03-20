import type { Socket } from "socket.io-client";

let clientSocket: Socket | null = null;

export function setClientSocket(socket: Socket | null): void {
  clientSocket = socket;
}

export function getClientSocket(): Socket | null {
  return clientSocket;
}

export function joinTicketRoom(ticketId: string): void {
  clientSocket?.emit("ticket:join", { ticketId });
}

export function leaveTicketRoom(ticketId: string): void {
  clientSocket?.emit("ticket:leave", { ticketId });
}
