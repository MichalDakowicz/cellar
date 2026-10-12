import { challengeFrom, verifierFrom } from "@/lib/qrLogin";

/** Memory-only verifier, using WebCrypto in the existing secure Cellar origin. */
export async function newVerifier() {
  const verifier = verifierFrom(crypto.getRandomValues(new Uint8Array(32)));
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return { verifier, challenge: challengeFrom(new Uint8Array(hash)) };
}
export function thisDevice() {
  const agent = navigator.userAgent;
  const system = /Windows/.test(agent)
    ? "Windows"
    : /Mac/.test(agent)
      ? "macOS"
      : /Linux/.test(agent)
        ? "Linux"
        : "desktop";
  return `Cellar desktop on ${system}`;
}
