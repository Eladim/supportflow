"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { TicketRoomBridge } from "@/components/ticket-room";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import type { PublicUser, TicketPriority, TicketStatus } from "@/lib/types";

type TicketDetail = {
  ticket: {
    id: string;
    title: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    category: string;
    dueAt: string | null;
    createdBy: { id: string; name: string; email: string };
    assignee: { id: string; name: string; email: string } | null;
    attachments: {
      id: string;
      originalName: string;
    }[];
  };
};

export default function TicketDetailPage() {
  const params = useParams<{ ticketId: string }>();
  const ticketId = params.ticketId;
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [noteText, setNoteText] = useState("");

  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";

  const ticketQ = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => apiFetch<TicketDetail>(`/api/v1/tickets/${ticketId}`),
  });

  const commentsQ = useQuery({
    queryKey: ["ticket", ticketId, "comments"],
    queryFn: () =>
      apiFetch<{
        comments: {
          id: string;
          authorId: string;
          body: string;
          createdAt: string;
        }[];
      }>(`/api/v1/tickets/${ticketId}/comments`),
  });

  const notesQ = useQuery({
    queryKey: ["ticket", ticketId, "notes"],
    queryFn: () =>
      apiFetch<{
        notes: {
          id: string;
          authorId: string;
          body: string;
          createdAt: string;
        }[];
      }>(`/api/v1/tickets/${ticketId}/notes`),
  });

  const activityQ = useQuery({
    queryKey: ["ticket", ticketId, "activity"],
    queryFn: () =>
      apiFetch<{
        activity: {
          id: string;
          action: string;
          createdAt: string;
          metadata: unknown;
        }[];
      }>(`/api/v1/tickets/${ticketId}/activity`),
  });

  const teamQ = useQuery({
    queryKey: ["users"],
    queryFn: () =>
      apiFetch<{
        users: (PublicUser & { openTicketCount: number })[];
      }>("/api/v1/users"),
    enabled: canManage,
  });

  const patchTicket = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiFetch(`/api/v1/tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket updated");
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "Update failed"),
  });

  const assignMut = useMutation({
    mutationFn: (assigneeId: string | null) =>
      apiFetch(`/api/v1/tickets/${ticketId}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ assigneeId }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Assignee updated");
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "Assign failed"),
  });

  const deleteMut = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/tickets/${ticketId}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket deleted");
      router.push("/tickets");
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "Delete failed"),
  });

  const addComment = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/tickets/${ticketId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: commentText }),
      }),
    onSuccess: () => {
      setCommentText("");
      void queryClient.invalidateQueries({
        queryKey: ["ticket", ticketId, "comments"],
      });
    },
  });

  const addNote = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/tickets/${ticketId}/notes`, {
        method: "POST",
        body: JSON.stringify({ body: noteText }),
      }),
    onSuccess: () => {
      setNoteText("");
      void queryClient.invalidateQueries({
        queryKey: ["ticket", ticketId, "notes"],
      });
    },
  });

  if (ticketQ.isLoading || !ticketQ.data) {
    return <p className="text-muted-foreground">Loading ticket…</p>;
  }

  const { ticket } = ticketQ.data;

  return (
    <div className="space-y-6">
      <TicketRoomBridge ticketId={ticketId} />
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 text-sm text-muted-foreground">
            <Link href="/tickets" className="hover:underline">
              Tickets
            </Link>
            <span className="mx-2">/</span>
            <span className="font-mono text-xs">{ticketId.slice(0, 8)}…</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{ticket.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <span className="text-sm text-muted-foreground">{ticket.category}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {canManage ? (
            <Button variant="destructive" onClick={() => deleteMut.mutate()}>
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm leading-relaxed">
            {ticket.description}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <Select
                value={ticket.status}
                onValueChange={(v) =>
                  patchTicket.mutate({ status: v as TicketStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                  <SelectItem value="WAITING_ON_CUSTOMER">Waiting</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground">Priority</Label>
              <Select
                value={ticket.priority}
                onValueChange={(v) =>
                  patchTicket.mutate({ priority: v as TicketPriority })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {canManage ? (
              <div>
                <Label className="text-muted-foreground">Assignee</Label>
                <Select
                  value={ticket.assignee?.id ?? "none"}
                  onValueChange={(v) =>
                    assignMut.mutate(v === "none" ? null : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {teamQ.data?.users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.openTicketCount} open)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <span className="text-muted-foreground">Assignee</span>
                <p className="font-medium">{ticket.assignee?.name ?? "—"}</p>
              </div>
            )}
            <Separator />
            <div>
              <span className="text-muted-foreground">Created by</span>
              <p>{ticket.createdBy.name}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="discussion">
        <TabsList>
          <TabsTrigger value="discussion">Discussion</TabsTrigger>
          <TabsTrigger value="internal">Internal notes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="discussion" className="space-y-4">
          {commentsQ.data?.comments.map((c) => (
            <Card key={c.id}>
              <CardContent className="pt-4 text-sm">
                <p className="whitespace-pre-wrap">{c.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                </p>
              </CardContent>
            </Card>
          ))}
          <div className="space-y-2">
            <Textarea
              placeholder="Add a reply…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <Button
              onClick={() => addComment.mutate()}
              disabled={!commentText.trim() || addComment.isPending}
            >
              Post comment
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="internal" className="space-y-4">
          {notesQ.data?.notes.map((n) => (
            <Card key={n.id} className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-4 text-sm">
                <p className="whitespace-pre-wrap">{n.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </CardContent>
            </Card>
          ))}
          <div className="space-y-2">
            <Textarea
              placeholder="Staff-only note…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <Button
              variant="secondary"
              onClick={() => addNote.mutate()}
              disabled={!noteText.trim() || addNote.isPending}
            >
              Add internal note
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="activity">
          <div className="space-y-3">
            {activityQ.data?.activity.map((a) => (
              <div key={a.id} className="text-sm">
                <span className="font-medium">{a.action}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
