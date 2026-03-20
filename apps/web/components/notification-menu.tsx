"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch } from "@/lib/api-client";

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
  data: unknown;
};

export function NotificationMenu() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      apiFetch<{
        notifications: NotificationRow[];
        total: number;
      }>("/api/v1/notifications?pageSize=15"),
  });

  const markRead = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAll = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/notifications/mark-all-read", { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unread =
    data?.notifications.filter((n) => n.readAt === null).length ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unread > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => markAll.mutate()}
            >
              <Check className="h-3 w-3" />
              Mark all read
            </Button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-64">
          {data?.notifications.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            data?.notifications.map((n) => {
              const meta = n.data && typeof n.data === "object" ? n.data : null;
              const ticketId =
                meta && "ticketId" in meta && typeof meta.ticketId === "string"
                  ? meta.ticketId
                  : null;
              return (
                <DropdownMenuItem
                  key={n.id}
                  className="flex cursor-default flex-col items-start gap-1 py-3"
                  onSelect={(e) => e.preventDefault()}
                >
                  <div className="flex w-full justify-between gap-2">
                    <span className="font-medium leading-none">{n.title}</span>
                    {!n.readAt ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 shrink-0 px-2 text-xs"
                        onClick={() => markRead.mutate(n.id)}
                      >
                        Mark read
                      </Button>
                    ) : null}
                  </div>
                  {n.body ? (
                    <span className="text-xs text-muted-foreground">{n.body}</span>
                  ) : null}
                  {ticketId ? (
                    <Link
                      href={`/tickets/${ticketId}`}
                      className="text-xs text-primary hover:underline"
                    >
                      View ticket
                    </Link>
                  ) : null}
                </DropdownMenuItem>
              );
            })
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
