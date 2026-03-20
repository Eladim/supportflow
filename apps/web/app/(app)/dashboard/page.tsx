"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Summary = {
  openTickets: number;
  urgentOpenTickets: number;
  resolvedLast7Days: number;
  totalTickets: number;
};

type ActivityItem = {
  id: string;
  action: string;
  createdAt: string;
  ticketId: string | null;
  metadata: unknown;
};

type Weekly = {
  days: { date: string; created: number; resolved: number }[];
};

export default function DashboardPage() {
  const summary = useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () => apiFetch<Summary>("/api/v1/analytics/summary"),
  });

  const recent = useQuery({
    queryKey: ["activity", "recent"],
    queryFn: () =>
      apiFetch<{ activity: ActivityItem[] }>("/api/v1/activity/recent?limit=12"),
  });

  const weekly = useQuery({
    queryKey: ["analytics", "weekly"],
    queryFn: () => apiFetch<Weekly>("/api/v1/analytics/weekly-activity"),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Live snapshot of queue health and recent team motion.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summary.isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          : (
            [
              {
                title: "Open tickets",
                value: summary.data?.openTickets ?? 0,
                hint: "Active workload",
              },
              {
                title: "Urgent open",
                value: summary.data?.urgentOpenTickets ?? 0,
                hint: "Needs eyes today",
              },
              {
                title: "Resolved (7d)",
                value: summary.data?.resolvedLast7Days ?? 0,
                hint: "Momentum",
              },
              {
                title: "All time",
                value: summary.data?.totalTickets ?? 0,
                hint: "Total volume",
              },
            ] as const
          ).map((c) => (
            <Card key={c.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {c.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tabular-nums">{c.value}</div>
                <p className="text-xs text-muted-foreground">{c.hint}</p>
              </CardContent>
            </Card>
          ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Weekly activity</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {weekly.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly.data?.days ?? []}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={32} />
                  <Tooltip />
                  <Bar dataKey="created" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolved" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recent.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              recent.data?.activity.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col gap-0.5 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-sm font-medium capitalize">
                    {a.action.toLowerCase().replaceAll("_", " ")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                    {a.ticketId ? ` · ticket ${a.ticketId.slice(0, 8)}…` : ""}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
