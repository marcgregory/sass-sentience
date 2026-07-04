import { useMutation } from "@tanstack/react-query";
import { restartSimulator } from "@/lib/simulator-admin";

export function useSimulatorRestart() {
  return useMutation({
    mutationFn: restartSimulator,
  });
}