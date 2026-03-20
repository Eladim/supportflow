"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/api-client";
import { buildWsUrl } from "@/lib/api-url";
import { setClientSocket } from "@/lib/socket-client";
import { useAuth } from "@/components/auth-provider";

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setClientSocket(null);
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    const s = io(buildWsUrl(), {
      auth: { token },
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = s;
    setClientSocket(s);

    const invTickets = () => {
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
    };

    s.on("ticket:updated", (p: { ticketId: string }) => {
      void queryClient.invalidateQueries({ queryKey: ["ticket", p.ticketId] });
      void queryClient.invalidateQueries({ queryKey: ["activity"] });
      invTickets();
    });
    s.on("ticket:created", invTickets);
    s.on("ticket:deleted", invTickets);

    s.on("comment:created", (payload: { ticketId: string }) => {
      void queryClient.invalidateQueries({
        queryKey: ["ticket", payload.ticketId, "comments"],
      });
    });
    s.on("comment:updated", (payload: { ticketId: string }) => {
      void queryClient.invalidateQueries({
        queryKey: ["ticket", payload.ticketId, "comments"],
      });
    });
    s.on("comment:deleted", (payload: { ticketId: string }) => {
      void queryClient.invalidateQueries({
        queryKey: ["ticket", payload.ticketId, "comments"],
      });
    });

    s.on("note:created", (payload: { ticketId: string }) => {
      void queryClient.invalidateQueries({
        queryKey: ["ticket", payload.ticketId, "notes"],
      });
    });
    s.on("note:updated", (payload: { ticketId: string }) => {
      void queryClient.invalidateQueries({
        queryKey: ["ticket", payload.ticketId, "notes"],
      });
    });
    s.on("note:deleted", (payload: { ticketId: string }) => {
      void queryClient.invalidateQueries({
        queryKey: ["ticket", payload.ticketId, "notes"],
      });
    });

    s.on("notification:new", () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });

    const ping = window.setInterval(() => {
      s.emit("presence:ping");
    }, 60000);

    return () => {
      window.clearInterval(ping);
      s.disconnect();
      socketRef.current = null;
      setClientSocket(null);
    };
  }, [user, queryClient]);

  return <>{children}</>;
}
