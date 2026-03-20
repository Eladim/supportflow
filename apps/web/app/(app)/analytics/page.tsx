"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function AnalyticsPage() {
  const byStatus = useQuery({
    queryKey: ["analytics", "by-status"],
    queryFn: () =>
      apiFetch<{ byStatus: { status: string; count: number }[] }>(
        "/api/v1/analytics/by-status",
      ),
  });
  const byPriority = useQuery({
    queryKey: ["analytics", "by-priority"],
    queryFn: () =>
      apiFetch<{ byPriority: { priority: string; count: number }[] }>(
        "/api/v1/analytics/by-priority",
      ),
  });
  const workload = useQuery({
    queryKey: ["analytics", "agent-workload"],
    queryFn: () =>
      apiFetch<{
        agents: { name: string | null; openAssigned: number }[];
      }>("/api/v1/analytics/agent-workload"),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Distribution and agent workload.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tickets by status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {byStatus.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byStatus.data?.byStatus ?? []}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={88}
                    label
                  >
                    {(byStatus.data?.byStatus ?? []).map((entry, index) => (
                      <Cell
                        key={entry.status}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tickets by priority</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {byPriority.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byPriority.data?.byPriority ?? []}>
                  <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
                  <YAxis width={28} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open tickets per agent</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          {workload.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={workload.data?.agents ?? []}
                layout="vertical"
                margin={{ left: 8 }}
              >
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar dataKey="openAssigned" fill="var(--primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
