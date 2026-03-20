"use client";

import { useEffect } from "react";
import { joinTicketRoom, leaveTicketRoom } from "@/lib/socket-client";

export function TicketRoomBridge({ ticketId }: { ticketId: string }) {
  useEffect(() => {
    joinTicketRoom(ticketId);
    return () => leaveTicketRoom(ticketId);
  }, [ticketId]);
  return null;
}
