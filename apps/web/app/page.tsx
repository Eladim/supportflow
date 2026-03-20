import Link from "next/link";
import { ArrowRight, MessageSquare, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background to-muted/30">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-xl font-bold tracking-tight">
          Support<span className="text-primary">Flow</span>
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-12 text-center md:pt-20">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Realtime tickets · Team analytics · Role-based access
        </div>
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight md:text-6xl">
          Team ticketing that feels like{" "}
          <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
            Linear
          </span>
          {" "}— built for agents & managers
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
          Run queues with roles for admin, manager, and agent: assign work, discuss on the ticket
          timeline, and watch the board update live — with analytics that stay actionable, not
          admin-heavy.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/register">
              Open workspace
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">View demo login</Link>
          </Button>
        </div>
        <div className="mx-auto mt-20 grid max-w-4xl gap-6 text-left md:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "Live updates",
              body: "Socket.IO syncs lists, detail, and comments without refresh.",
            },
            {
              icon: MessageSquare,
              title: "Threads + internal notes",
              body:
                "Comment on the ticket timeline together; internal notes stay visible only to staff.",
            },
            {
              icon: Sparkles,
              title: "Recruiter-ready stack",
              body: "Next.js App Router, Express, Prisma, OpenAPI, Docker.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card/60 p-5 shadow-sm backdrop-blur"
            >
              <Icon className="mb-3 h-8 w-8 text-primary" />
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
