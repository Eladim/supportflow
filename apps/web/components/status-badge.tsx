import { Badge } from "@/components/ui/badge";
import type { TicketPriority, TicketStatus } from "@/lib/types";

const statusLabel: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_ON_CUSTOMER: "Waiting",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const priorityVariant: Record<
  TicketPriority,
  "default" | "secondary" | "destructive" | "outline"
> = {
  URGENT: "destructive",
  HIGH: "destructive",
  MEDIUM: "default",
  LOW: "secondary",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge variant="outline">{statusLabel[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <Badge variant={priorityVariant[priority]}>{priority}</Badge>;
}
