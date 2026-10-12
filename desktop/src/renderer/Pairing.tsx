import { useEffect, useState } from "react";
import qrcode from "qrcode-generator";
import { bridge } from "./client";
import type { DeskPairing } from "./bridge";

export function Pairing() {
  const [pairing, setPairing] = useState<DeskPairing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState(false);
  async function load() {
    try {
      setPairing(await bridge!.pairing());
    } catch (error) {
      setError(String(error));
    }
  }
  useEffect(() => {
    if (!bridge) return;
    void load();
    const timer = setInterval(() => {
      void load();
    }, 30_000);
    return () => clearInterval(timer);
  }, []);
  const qr = pairing?.url ? qrcode(0, "M") : null;
  if (qr && pairing?.url) {
    qr.addData(pairing.url);
    qr.make();
  }
  return (
    <section className="stack">
      <h2>this pc</h2>
      <p className="muted">pair a phone with this host</p>
      {qr && (
        <img
          className="pair-code"
          src={qr.createDataURL(4, 8)}
          alt="scan this pairing code with Cellar on phone"
        />
      )}
      {pairing?.url === null && <p>{pairing.reason}</p>}
      <div className="row">
        <input
          aria-label="host name"
          placeholder="rename this pc"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          disabled={!bridge || !name.trim()}
          onClick={() =>
            void bridge!
              .rename(name.trim())
              .then(() => {
                setName("");
                void load();
              })
              .catch((error) => setError(String(error)))
          }
        >
          rename
        </button>
      </div>
      <button disabled={!bridge} onClick={() => setConfirm(!confirm)}>
        forget every paired phone
      </button>
      {confirm && (
        <div className="card stack">
          <p>
            Every phone must scan again. Host history and account stay intact.
          </p>
          <button
            className="danger"
            onClick={() =>
              void bridge!
                .forgetPhones()
                .then(() => {
                  setConfirm(false);
                  void load();
                })
                .catch((error) => setError(String(error)))
            }
          >
            confirm forget paired phones
          </button>
        </div>
      )}
      {error && <p role="status">{error}</p>}
      {!bridge && (
        <p className="muted">
          Pairing issuance unavailable in browser preview.
        </p>
      )}
    </section>
  );
}
