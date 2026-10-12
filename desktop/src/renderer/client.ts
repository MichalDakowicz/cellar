import { deskCalls, refusal, type DeskTransport } from "@/lib/deskCalls";
import { deskBridge } from "./bridge";

export const APP_ROLE = "desktop-host" as const;
export const bridge = deskBridge();
const transport: DeskTransport = async (method, path, body) => {
  if (!bridge)
    throw new Error(
      "Open this renderer in Cellar desktop. Local host bridge unavailable.",
    );
  const reply = await bridge.request(method, path, body);
  if (reply.status < 200 || reply.status >= 300)
    throw refusal(reply.status, reply.body);
  return reply.body;
};
export const calls = deskCalls(transport, true);
