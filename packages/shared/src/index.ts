import { z } from "zod";

export const RoleSchema = z.enum(["ADMIN", "MANAGER", "AGENT"]);
export type Role = z.infer<typeof RoleSchema>;

export const TicketStatusSchema = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "WAITING_ON_CUSTOMER",
  "RESOLVED",
  "CLOSED",
]);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

export const TicketPrioritySchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);
export type TicketPriority = z.infer<typeof TicketPrioritySchema>;

export const ActivityActionSchema = z.enum([
  "TICKET_CREATED",
  "TICKET_UPDATED",
  "STATUS_CHANGED",
  "PRIORITY_CHANGED",
  "ASSIGNED",
  "COMMENT_ADDED",
  "NOTE_ADDED",
  "ATTACHMENT_ADDED",
]);
export type ActivityAction = z.infer<typeof ActivityActionSchema>;

export const NotificationTypeSchema = z.enum([
  "TICKET_ASSIGNED",
  "TICKET_UPDATED",
  "COMMENT_ADDED",
  "NOTE_ADDED",
  "MENTION",
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
