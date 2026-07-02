/**
 * RealtimeListener — activates the Socket.IO connection and wires live
 * event handlers into the Zustand live-device store.
 *
 * This component renders nothing. It exists only to call `useSocket()`
 * within a "use client" boundary inside the dashboard layout.
 */

"use client";

import { useSocket } from "@/hooks/use-socket";

export function RealtimeListener() {
  useSocket();
  return null;
}
