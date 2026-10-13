import { useEffect } from "react";
import { useQrRequester } from "./qr/useQrRequester";
import { QrCode } from "./QrCode";

export function LoginQr() {
  const { state, showCode, reset } = useQrRequester();
  useEffect(() => {
    void showCode();
    return reset;
  }, [showCode, reset]);
  return (
    <section className="stack">
      <h2>sign in with phone</h2>
      <p className="muted">
        Scan in Cellar on signed-in phone. Match both numbers before approving.
      </p>
      {state.phase === "showing" && (
        <QrCode
          payload={state.payload}
          label="scan with your signed-in Cellar phone"
        />
      )}
      {(state.phase === "showing" || state.phase === "deciding") && (
        <>
          <strong className="stat mono">{state.matchCode}</strong>
          <small className="muted">
            {state.phase === "deciding"
              ? "waiting for your approval on phone"
              : "waiting for phone to scan"}{" "}
            · expires {new Date(state.expiresAt).toLocaleTimeString()}
          </small>
        </>
      )}
      {state.phase === "ended" && (
        <p role="status">{state.detail ?? state.reason}</p>
      )}
      {state.phase === "denied" && <p>request declined</p>}
      {["ended", "denied"].includes(state.phase) && (
        <button onClick={() => void showCode()}>new code</button>
      )}
      {["working", "signing-in"].includes(state.phase) && (
        <p className="muted">
          {state.phase === "working" ? "opening code…" : "signing in…"}
        </p>
      )}
    </section>
  );
}
