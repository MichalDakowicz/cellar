export const DESKTOP_ORIGIN = "cellar-desk://app";
export const RENDERER_DEV_ORIGIN = "http://127.0.0.1:5173";

/** Privilege stays on Cellar's own top-level renderer, never an embedded preview. */
export function isCellarOrigin(url: string, dev: boolean): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "cellar-desk:")
      return (
        `${parsed.protocol}//${parsed.host}` === DESKTOP_ORIGIN &&
        !parsed.username &&
        !parsed.password
      );
    return (
      dev &&
      parsed.origin === RENDERER_DEV_ORIGIN &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}
export function isRendererSender(input: {
  url: string;
  dev: boolean;
  senderId: number;
  windowId: number | null;
  topLevel: boolean;
}): boolean {
  return (
    input.windowId !== null &&
    input.senderId === input.windowId &&
    input.topLevel &&
    isCellarOrigin(input.url, input.dev)
  );
}
export function readIpcRequest(raw: unknown): {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
} {
  const row = raw as {
    method?: unknown;
    path?: unknown;
    body?: unknown;
  } | null;
  if (
    !row ||
    (row.method !== "GET" && row.method !== "POST") ||
    typeof row.path !== "string" ||
    row.path.length > 2048 ||
    !/^\/(?!\/)[^\s?#\\]*$/.test(row.path)
  )
    throw new Error("Invalid Cellar host request.");
  return {
    method: row.method,
    path: row.path,
    ...(row.body !== undefined ? { body: row.body } : {}),
  };
}
