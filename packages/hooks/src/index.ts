export function useIsClient() {
  return typeof window !== "undefined";
}

export function useMediaQuery(query: string): boolean {
  // Stub — will be expanded with real implementation
  return false;
}
