import { useQrApprover } from "./qr/useQrApprover";
import { describeRequester } from "@/lib/qrLogin";
import { QrCode } from "./QrCode";
import { VISUAL_PREVIEW } from "./appMode";

export function AccountDevices() {
  const { state, showCode, decide, reset } = useQrApprover();
  return (
    <section className="stack">
      <h2>other devices</h2>
      <p className="muted">
        Sign another Cellar device in with your Ping account. This is separate
        from host pairing.
      </p>
      {state.phase === "idle" && (
        <button disabled={VISUAL_PREVIEW} onClick={() => void showCode()}>
          show sign-in code
        </button>
      )}
      {state.phase === "showing" && (
        <>
          <QrCode
            payload={state.payload}
            label="scan on device you want to sign in"
          />
          <strong className="stat mono">{state.matchCode}</strong>
          <small className="muted">
            expires {new Date(state.expiresAt).toLocaleTimeString()}
          </small>
        </>
      )}
      {state.phase === "confirm" && (
        <div className="card stack">
          <p>Request claims: {describeRequester(state.requester).label}</p>
          <small className="muted">
            {describeRequester(state.requester).country ?? "country unknown"}
          </small>
          <strong className="stat mono">{state.matchCode}</strong>
          <p>
            Match number on other device. Approve gives that device its own
            account session.
          </p>
          <div className="chips">
            <button
              disabled={!!state.deciding}
              onClick={() => void decide("approve")}
            >
              approve sign-in
            </button>
            <button
              disabled={!!state.deciding}
              onClick={() => void decide("decline")}
            >
              decline
            </button>
          </div>
        </div>
      )}
      {state.phase === "ended" && (
        <p role="status">{state.detail ?? state.reason}</p>
      )}
      {["approved", "declined"].includes(state.phase) && <p>{state.phase}</p>}
      {state.phase !== "idle" && (
        <button onClick={reset}>close sign-in code</button>
      )}
    </section>
  );
}
