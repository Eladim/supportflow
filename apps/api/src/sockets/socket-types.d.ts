import type { Role } from "@prisma/client";

declare module "socket.io" {
  interface SocketData {
    userId: string;
    role: Role;
  }
}

export {};
