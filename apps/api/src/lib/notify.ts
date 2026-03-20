import type { NotificationType, Prisma } from "@prisma/client";
import { emitToUser } from "../sockets/io-registry.js";
import { prisma } from "./prisma.js";
import { serializeNotification } from "./serialize.js";

export async function notifyUser(
  userId: string,
  type: NotificationType,
  title: string,
  body: string | null,
  data: Prisma.InputJsonValue,
): Promise<void> {
  const n = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      data,
    },
  });
  emitToUser(userId, "notification:new", { notification: serializeNotification(n) });
}
