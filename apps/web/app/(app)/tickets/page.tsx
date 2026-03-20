"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import type { PublicUser, TicketListItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { formatDistanceToNow } from "date-fns";

export default function TicketsPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading tickets…</p>}>
      <TicketsContent />
    </Suspense>
  );
}

function TicketsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const sort = searchParams.get("sort") ?? "newest";
  const assigneeFilter = searchParams.get("assignee") ?? "";

  const [createOpen, setCreateOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("general");

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () =>
      apiFetch<{ users: (PublicUser & { openTicketCount: number })[] }>(
        "/api/v1/users",
      ),
  });

  const listQuery = useQuery({
    queryKey: ["tickets", { page, search, status, sort, assigneeFilter }],
    queryFn: () => {
      const q = new URLSearchParams();
      q.set("page", String(page));
      q.set("pageSize", "15");
      if (search) q.set("search", search);
      if (status) q.set("status", status);
      if (sort) q.set("sort", sort);
      if (assigneeFilter === "unassigned") q.set("unassigned", "true");
      else if (assigneeFilter) q.set("assigneeId", assigneeFilter);
      return apiFetch<{
        tickets: TicketListItem[];
        total: number;
        pageSize: number;
      }>(`/api/v1/tickets?${q.toString()}`);
    },
  });

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch<{ ticket: { id: string } }>("/api/v1/tickets", {
        method: "POST",
        body: JSON.stringify({
          title: formTitle,
          description: formDesc,
          category: formCategory,
        }),
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setCreateOpen(false);
      setFormTitle("");
      setFormDesc("");
      toast.success("Ticket created");
      router.push(`/tickets/${data.ticket.id}`);
    },
    onError: (e) => {
      toast.error(e instanceof ApiClientError ? e.message : "Failed");
    },
  });

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("page", "1");
    router.push(`/tickets?${next.toString()}`);
  }

  const totalPages = listQuery.data
    ? Math.max(1, Math.ceil(listQuery.data.total / listQuery.data.pageSize))
    : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground">Search, filter, and drill into realtime threads.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>New ticket</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="t-title">Title</Label>
                <Input
                  id="t-title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="t-cat">Category</Label>
                <Input
                  id="t-cat"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="t-desc">Description</Label>
                <Textarea
                  id="t-desc"
                  rows={4}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => createMut.mutate()}
                disabled={
                  createMut.isPending || !formTitle.trim() || !formDesc.trim()
                }
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search…"
          className="max-w-xs"
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setParam("search", (e.target as HTMLInputElement).value);
            }
          }}
        />
        <Select value={status || "all"} onValueChange={(v) => setParam("status", v === "all" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In progress</SelectItem>
            <SelectItem value="WAITING_ON_CUSTOMER">Waiting</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setParam("sort", v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="dueDate">Due date</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={assigneeFilter || "all"}
          onValueChange={(v) =>
            setParam("assignee", v === "all" ? "" : v)
          }
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {usersQuery.data?.users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : listQuery.data?.tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No tickets match.
                </TableCell>
              </TableRow>
            ) : (
              listQuery.data?.tickets.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link
                      href={`/tickets/${t.id}`}
                      className="font-medium hover:underline"
                    >
                      {t.title}
                    </Link>
                    <div className="text-xs text-muted-foreground">{t.category}</div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={t.priority} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {t.assignee?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between text-sm">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => {
            const next = new URLSearchParams(searchParams.toString());
            next.set("page", String(page - 1));
            router.push(`/tickets?${next}`);
          }}
        >
          Previous
        </Button>
        <span className="text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => {
            const next = new URLSearchParams(searchParams.toString());
            next.set("page", String(page + 1));
            router.push(`/tickets?${next}`);
          }}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
