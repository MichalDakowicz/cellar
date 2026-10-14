import { useState } from "react";
import {
  Circle,
  Square,
  Triangle,
  RotateCw,
  Keyboard,
  Power,
  Package,
  Smartphone,
} from "lucide-react";
import { saved, useSaved } from "./preferences";
import { SAMPLE_PHONE } from "@/lib/deskSample";
import { PhoneMirror } from "./PhoneMirror";
import { LivePhone } from './LivePhone';

export function Phone() {
  useSaved();
  const sample = saved<boolean>("cellar-desk-prefs", "sample", false);
  const [driver, setDriver] = useState("agent drives");
  const [level, setLevel] = useState("info+");
  if (!sample) return <LivePhone />;
  if (!sample)
    return (
      <div className="page stack">
        <h1>phone</h1>
        <div className="empty stack">
          <Smartphone size={32} />
          <p>
            Phone mirror and control unavailable. Host does not advertise ADB
            yet.
          </p>
          <p className="muted">
            Sample presenter available in devices settings.
          </p>
        </div>
      </div>
    );
  return (
    <div className="page stack">
      <header>
        <h1>{SAMPLE_PHONE.name}</h1>
        <p className="muted">
          sample phone · {SAMPLE_PHONE.line} · controls unavailable
        </p>
      </header>
      <div className="device-columns">
        <section className="phone-mirror stack">
          <div
            className="segments"
            role="group"
            aria-label="sample phone driver"
          >
            {["just watch", "i drive", "agent drives"].map((value) => (
              <button
                aria-pressed={driver === value}
                key={value}
                onClick={() => setDriver(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <PhoneMirror driving={driver === "agent drives"} />
          <div className="chips">
            {[
              [Triangle, "back"],
              [Circle, "home"],
              [Square, "recent apps"],
              [RotateCw, "rotate"],
              [Keyboard, "type on phone"],
              [Power, "screen off"],
            ].map(([Icon, label]) => {
              const Glyph = Icon as typeof Triangle;
              return (
                <button
                  className="icon"
                  title="ADB unavailable"
                  aria-label={String(label)}
                  disabled
                  key={String(label)}
                >
                  <Glyph size={17} />
                </button>
              );
            })}
          </div>
          <small className="muted">sample mirror · no phone input</small>
        </section>
        <div className="stack device-tools">
          <h2 className="overline">install and open</h2>
          <div className="card row wrap">
            <Package size={20} />
            <div>
              <strong className="mono">{SAMPLE_PHONE.apk.file}</strong>
              <p className="muted">{SAMPLE_PHONE.apk.line}</p>
            </div>
            <button disabled>clear data</button>
            <button disabled>uninstall</button>
            <button disabled>install and open</button>
          </div>
          <div className="row">
            <input
              className="mono"
              aria-label="sample deep link"
              readOnly
              value={SAMPLE_PHONE.deepLink}
            />
            <button disabled>open on {SAMPLE_PHONE.name}</button>
          </div>
          <h2 className="overline">capture</h2>
          <div className="capture-tiles">
            {[
              ["screenshot", "into open chat or clipboard"],
              ["record 30s", "with taps shown, as short clip"],
              [
                "file this screen",
                "new glitch with screenshot and last 200 log lines",
              ],
            ].map(([label, detail]) => (
              <button className="card stack" disabled key={label}>
                <strong>{label}</strong>
                <small className="muted">{detail}</small>
              </button>
            ))}
          </div>
          <div className="two-columns">
            <section className="stack">
              <div className="row">
                <h2 className="overline">logcat · com.ping.cellar</h2>
                <div className="segments">
                  {["all", "info+", "errors"].map((value) => (
                    <button
                      key={value}
                      aria-pressed={level === value}
                      onClick={() => setLevel(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
              <pre className="sample-log">
                {SAMPLE_PHONE.log
                  .filter((row) => level !== "errors" || row.level === "E")
                  .map((row) => `${row.at} ${row.level} ${row.text}`)
                  .join("\n")}
              </pre>
              <div className="chips">
                <button disabled>send these lines to agent</button>
                <button disabled>pause</button>
                <button disabled>clear</button>
              </div>
            </section>
            <section className="stack">
              <h2 className="overline">phone settings over adb</h2>
              {SAMPLE_PHONE.toggles.map((label) => (
                <label className="settings-row" key={label}>
                  {label}
                  <input
                    type="checkbox"
                    disabled
                    checked={label === "dark theme"}
                  />
                </label>
              ))}
              <p className="muted">network · normal / slow / offline</p>
              <p className="muted">font size · 1× / 1.3× / 2×</p>
              <h2 className="overline">agents on this phone</h2>
              <p className="muted">
                sample only · no installs, taps or screenshots execute
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
