export type Role = "ADMIN" | "MANAGER" | "AGENT";

export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_ON_CUSTOMER"
  | "RESOLVED"
  | "CLOSED";

export type TicketPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketListItem {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  dueAt: string | null;
  createdById: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string; email: string };
  assignee: { id: string; name: string; email: string } | null;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: { path: string; message: string }[];
}
