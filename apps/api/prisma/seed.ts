import { PrismaClient, TicketPriority, TicketStatus } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

const statuses: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_ON_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];
const priorities: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

async function main(): Promise<void> {
  const passwordHash = await argon2.hash("demo12345", { type: argon2.argon2id });

  const admin = await prisma.user.upsert({
    where: { email: "admin@supportflow.local" },
    update: {},
    create: {
      email: "admin@supportflow.local",
      passwordHash,
      name: "Alex Admin",
      role: "ADMIN",
    },
  });
  const manager = await prisma.user.upsert({
    where: { email: "manager@supportflow.local" },
    update: {},
    create: {
      email: "manager@supportflow.local",
      passwordHash,
      name: "Morgan Manager",
      role: "MANAGER",
    },
  });
  const agents = await Promise.all(
    ["Sam Agent", "Jamie Support", "Riley Helpdesk"].map((name, i) =>
      prisma.user.upsert({
        where: { email: `agent${i}@supportflow.local` },
        update: {},
        create: {
          email: `agent${i}@supportflow.local`,
          passwordHash,
          name,
          role: "AGENT",
        },
      }),
    ),
  );

  const allUsers = [admin, manager, ...agents];
  const categories = ["billing", "product", "access", "feedback", "incident"];

  for (let i = 0; i < 45; i += 1) {
    const status = statuses[i % statuses.length];
    const priority = priorities[i % priorities.length];
    const creator = allUsers[i % allUsers.length];
    const assignee = i % 3 === 0 ? null : agents[i % agents.length];
    const ticket = await prisma.ticket.create({
      data: {
        title: `Demo ticket #${i + 1}: ${categories[i % categories.length]} issue`,
        description: `This is seeded ticket ${i + 1} for dashboard and analytics. Status ${status}, priority ${priority}.`,
        status,
        priority,
        category: categories[i % categories.length],
        dueAt: i % 4 === 0 ? new Date(Date.now() + (i + 1) * 86400000) : null,
        createdById: creator.id,
        assigneeId: assignee?.id ?? null,
      },
    });
    await prisma.activityLog.create({
      data: {
        actorId: creator.id,
        ticketId: ticket.id,
        action: "TICKET_CREATED",
        metadata: { title: ticket.title },
      },
    });
    if (i % 5 === 0) {
      await prisma.ticketComment.create({
        data: {
          ticketId: ticket.id,
          authorId: agents[0].id,
          body: "Following up on this — any updates from the customer?",
        },
      });
    }
    if (i % 7 === 0) {
      await prisma.internalNote.create({
        data: {
          ticketId: ticket.id,
          authorId: manager.id,
          body: "Internal: escalated if still open after 48h.",
        },
      });
    }
  }

  console.log("Seed complete. Login: admin@supportflow.local / demo12345");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
