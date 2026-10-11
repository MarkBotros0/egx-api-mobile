/** The shared API throws Error(detail) — show that text, it names the problem. */
export function errorMessage(e: unknown, fallback = "Something went wrong"): string {
  return e instanceof Error && e.message ? e.message : fallback;
}
