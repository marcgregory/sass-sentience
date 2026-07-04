import { post } from "@/lib/api-client";

export interface SimulatorRestartResponse {
  message: string;
  deployId: string | null;
}

export function restartSimulator(): Promise<SimulatorRestartResponse> {
  return post<SimulatorRestartResponse>("/admin/simulator/restart");
}