import type { ActivityAction, Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export async function logActivity(
  actorId: string | null,
  ticketId: string | null,
  action: ActivityAction,
  metadata: Prisma.InputJsonValue = {},
): Promise<void> {
  await prisma.activityLog.create({
    data: {
      actorId,
      ticketId,
      action,
      metadata,
    },
  });
}
