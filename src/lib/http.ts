/** Reads an HTTP status code from nested fetch/axios-style errors. */
export function extractHttpStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;

  const withStatus = err as { status?: unknown; response?: { status?: unknown }; cause?: unknown };
  if (typeof withStatus.status === "number") return withStatus.status;
  if (typeof withStatus.response?.status === "number") return withStatus.response.status;
  if (withStatus.cause) return extractHttpStatus(withStatus.cause);

  return undefined;
}
