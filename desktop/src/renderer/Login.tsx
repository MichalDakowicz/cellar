import { useState } from "react";
import { supabase } from "./auth";
import { bridge } from "./client";
import { DESKTOP_OAUTH_CALLBACK } from "./bridge";
import { LoginQr } from "./LoginQr";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState(false);
  const [signup, setSignup] = useState(false);
  async function google() {
    setBusy(true);
    setError(null);
    try {
      const start = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: DESKTOP_OAUTH_CALLBACK,
          skipBrowserRedirect: true,
        },
      });
      if (start.error) throw start.error;
      if (!start.data.url) throw new Error("Google sign-in link unavailable.");
      const response = await bridge!.googleSignIn(start.data.url);
      if ("error" in response) throw new Error(response.error);
      const result = await supabase.auth.exchangeCodeForSession(response.code);
      if (result.error) throw result.error;
    } catch (error) {
      setError(String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login stack">
      <h1>cellar</h1>
      <p className="muted">your thoughts, on this pc</p>
      <button disabled={busy} onClick={() => void google()}>
        continue with google
      </button>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          const request = { email: email.trim(), password };
          void (
            signup
              ? supabase.auth.signUp(request)
              : supabase.auth.signInWithPassword(request)
          )
            .then(({ data, error }) =>
              setError(
                error?.message ??
                  (signup && !data.session
                    ? "Check your email to finish signing up."
                    : null),
              ),
            )
            .finally(() => setBusy(false));
        }}
      >
        <input
          autoComplete="username"
          type="email"
          aria-label="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <input
          autoComplete={signup ? "new-password" : "current-password"}
          type="password"
          aria-label="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button className="primary" disabled={busy}>
          {signup ? "create ping account" : "sign in"}
        </button>
      </form>
      <button disabled={busy} onClick={() => setSignup(!signup)}>
        {signup
          ? "already have a ping account? sign in"
          : "new to ping? create account"}
      </button>
      <button disabled={busy} onClick={() => setQr(!qr)}>
        sign in with phone
      </button>
      {qr && <LoginQr />}
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
