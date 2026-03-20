import type {
  ActivityLog,
  Attachment,
  InternalNote,
  Notification,
  Ticket,
  TicketComment,
  User,
} from "@prisma/client";

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: User["role"];
  avatarUrl: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeUser(u: User): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    avatarUrl: u.avatarUrl,
    lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

export type PublicTicket = {
  id: string;
  title: string;
  description: string;
  status: Ticket["status"];
  priority: Ticket["priority"];
  category: string;
  dueAt: string | null;
  createdById: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeTicket(t: Ticket): PublicTicket {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    category: t.category,
    dueAt: t.dueAt?.toISOString() ?? null,
    createdById: t.createdById,
    assigneeId: t.assigneeId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export type PublicComment = {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeComment(c: TicketComment): PublicComment {
  return {
    id: c.id,
    ticketId: c.ticketId,
    authorId: c.authorId,
    body: c.body,
    parentId: c.parentId,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export type PublicNote = {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeNote(n: InternalNote): PublicNote {
  return {
    id: n.id,
    ticketId: n.ticketId,
    authorId: n.authorId,
    body: n.body,
    parentId: n.parentId,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

export type PublicActivity = {
  id: string;
  actorId: string | null;
  ticketId: string | null;
  action: ActivityLog["action"];
  metadata: unknown;
  createdAt: string;
};

export function serializeActivity(a: ActivityLog): PublicActivity {
  return {
    id: a.id,
    actorId: a.actorId,
    ticketId: a.ticketId,
    action: a.action,
    metadata: a.metadata,
    createdAt: a.createdAt.toISOString(),
  };
}

export type PublicNotification = {
  id: string;
  userId: string;
  type: Notification["type"];
  title: string;
  body: string | null;
  data: unknown;
  readAt: string | null;
  createdAt: string;
};

export function serializeNotification(n: Notification): PublicNotification {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    body: n.body,
    data: n.data,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

export type PublicAttachment = {
  id: string;
  ticketId: string | null;
  commentId: string | null;
  noteId: string | null;
  uploadedById: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: string;
};

export function serializeAttachment(a: Attachment): PublicAttachment {
  return {
    id: a.id,
    ticketId: a.ticketId,
    commentId: a.commentId,
    noteId: a.noteId,
    uploadedById: a.uploadedById,
    originalName: a.originalName,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    storageKey: a.storageKey,
    createdAt: a.createdAt.toISOString(),
  };
}
