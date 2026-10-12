import { useEffect, useState } from "react";
import type { AgentToken } from "@/types/cellar";
import { fullSetup, skillInstall, type Shell } from "@/lib/agentInstall";
import { mcpConfig } from "@/lib/agentConfig";
import {
  fetchAgentTokens,
  createAgentToken,
  revokeAgentToken,
} from "./data/agentTokensApi";
import { supabase } from "./auth";
import { VISUAL_PREVIEW } from "./appMode";

/** Existing account tools; credentials are entered by the account owner. */
export function AgentAccess() {
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [tokens, setTokens] = useState<AgentToken[]>([]);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const url = import.meta.env.VITE_SUPABASE_URL;
  useEffect(() => {
    let active = true;
    if (!VISUAL_PREVIEW)
      void fetchAgentTokens()
        .then((rows) => {
          if (active) setTokens(rows);
        })
        .catch((error) => {
          if (active) setMessage(String(error));
        });
    return () => {
      active = false;
    };
  }, []);
  async function act(action: () => Promise<void>) {
    if (busy || VISUAL_PREVIEW) return;
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("copied");
    } catch (error) {
      setMessage(String(error));
    }
  }
  return (
    <section className="stack">
      <h2 className="overline">password for agent tools</h2>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          void act(async () => {
            const result = await supabase.auth.updateUser({ password });
            if (result.error) throw result.error;
            setPassword("");
            setMessage("password set · Google sign-in keeps working");
          });
        }}
      >
        <input
          aria-label="password for agent tools"
          type="password"
          autoComplete="new-password"
          placeholder="at least six characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button disabled={busy || password.length < 6 || VISUAL_PREVIEW}>
          set the password
        </button>
      </form>
      <p className="muted">
        Local MCP login can use your email and password. Google sign-in stays
        available.
      </p>
      <h2 className="overline">agent tokens</h2>
      <form
        className="row"
        onSubmit={(event) => {
          event.preventDefault();
          void act(async () => {
            setFresh(await createAgentToken(name.trim()));
            setName("");
            setTokens(await fetchAgentTokens());
          });
        }}
      >
        <input
          aria-label="agent token name"
          placeholder="which machine?"
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button disabled={busy || !name.trim() || VISUAL_PREVIEW}>
          make a token
        </button>
      </form>
      <p className="muted">
        Tokens give an agent your Cellar access. Revoke one to stop its next
        call.
      </p>
      {fresh && (
        <section className="card stack">
          <code className="token-value">{fresh}</code>
          <small className="muted">Copy now. Only its hash is stored.</small>
          <button onClick={() => void copy(fresh)}>copy token</button>
          <button onClick={() => void copy(mcpConfig(url, fresh))}>
            copy MCP config
          </button>
          <button onClick={() => setFresh(null)}>hide token</button>
        </section>
      )}
      {tokens.map((token) => (
        <div className="settings-row" key={token.id}>
          <span>
            {token.name}
            <small className="muted">
              {token.revokedAt
                ? " · revoked"
                : token.lastUsedAt
                  ? ` · used ${new Date(token.lastUsedAt).toLocaleDateString()}`
                  : " · never used"}
            </small>
          </span>
          {!token.revokedAt && (
            <button disabled={busy} onClick={() => setConfirm(token.id)}>
              revoke
            </button>
          )}
        </div>
      ))}
      {confirm && (
        <section className="card stack">
          <p>Revoke this agent token? Its access stops on the next call.</p>
          <button
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await revokeAgentToken(confirm);
                setConfirm(null);
                setTokens(await fetchAgentTokens());
              })
            }
          >
            revoke token
          </button>
          <button onClick={() => setConfirm(null)}>cancel</button>
        </section>
      )}
      <h2 className="overline">agent skill</h2>
      <p className="muted">
        Copy setup for the machine where the agent runs. The skill teaches it to
        claim, ask and report back.
      </p>
      <div className="chips">
        {(["powershell", "sh"] as Shell[]).map((shell) => (
          <button
            key={shell}
            onClick={() =>
              void copy(
                fresh ? fullSetup(shell, url, fresh) : skillInstall(shell),
              )
            }
          >
            {shell === "powershell"
              ? "copy Windows setup"
              : "copy mac + Linux setup"}
          </button>
        ))}
      </div>
      {VISUAL_PREVIEW && (
        <p className="muted">Sample · account changes unavailable.</p>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
