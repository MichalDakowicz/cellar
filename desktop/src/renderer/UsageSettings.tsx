import { SAMPLE_USAGE, SAMPLE_USAGE_MORE } from "@/lib/deskSample";
import { ProviderAccounts } from './ProviderAccounts';

export function UsageSettings({ sample }: { sample: boolean }) {
  if (!sample)
    return (
      <div className="stack"><p className="muted">Open a connected run for provider-reported windows, reset times and context. Context at 80% offers /compact. Missing limits remain unavailable.</p><ProviderAccounts /></div>
    );
  return (
    <div className="stack">
      <p className="muted">sample usage · no provider account actions</p>
      <section className="card stack">
        <h2>this chat</h2>
        <p>{SAMPLE_USAGE_MORE.chat.title}</p>
        <div className="row">
          <span className="mono">
            {SAMPLE_USAGE_MORE.chat.used}k / {SAMPLE_USAGE_MORE.chat.of}k
          </span>
          <meter
            min={0}
            max={SAMPLE_USAGE_MORE.chat.of}
            value={SAMPLE_USAGE_MORE.chat.used}
          />
        </div>
      </section>
      <div className="two-columns">
        {SAMPLE_USAGE.map((agent) => (
          <section className="card stack" key={agent.agent}>
            <h2>{agent.agent}</h2>
            {agent.windows.map((window) => (
              <div className="stack" key={window.label}>
                <div className="row">
                  <span>{window.label}</span>
                  <span className="mono">{window.used}%</span>
                </div>
                <meter min={0} max={100} value={window.used} />
                <small className="muted">{window.resets}</small>
              </div>
            ))}
          </section>
        ))}
      </div>
      <h2 className="overline">accounts</h2>
      {SAMPLE_USAGE_MORE.accounts.map((agent) => (
        <section className="card stack" key={agent.agent}>
          <h3>{agent.agent}</h3>
          {agent.rows.map((row) => (
            <div className="settings-row" key={row.label}>
              <div>
                <strong>{row.label}</strong>
                <p className="muted">{row.meta}</p>
                <small className="mono muted">{row.usage}</small>
              </div>
              <button disabled>
                {row.active ? "active · sample" : "use · unavailable"}
              </button>
            </div>
          ))}
        </section>
      ))}
      <h2 className="overline">spent on</h2>
      {SAMPLE_USAGE_MORE.spent.map((row) => (
        <div className="settings-row" key={row.title}>
          <span>
            {row.title}
            <small className="muted"> · {row.agent}</small>
          </span>
          <span className="mono">{row.tokens}</span>
        </div>
      ))}
    </div>
  );
}
