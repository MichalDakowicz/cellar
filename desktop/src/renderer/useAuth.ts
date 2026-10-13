import { sessionHandoff } from "../sessionHandoff";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabase } from "./auth";
import { bridge } from "./client";

export function useAuth() {
  const [state, setState] = useState<{
    session: Session | null;
    loading: boolean;
    error: string | null;
  }>({ session: null, loading: true, error: null });
  useEffect(() => {
    let active = true;
    const handoff = sessionHandoff<Session | null>(
      async (session) =>
        bridge?.setSession(
          session
            ? { accessToken: session.access_token, userId: session.user.id }
            : null,
        ),
      (session, error) =>
        setState({
          session,
          loading: false,
          error: error ? String(error) : null,
        }),
    );
    const initialRevision = handoff.revision;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        if (active && handoff.revision === initialRevision)
          setState({ session: null, loading: false, error: error.message });
      } else if (handoff.revision === initialRevision)
        void handoff.accept(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void handoff.accept(session);
    });
    return () => {
      active = false;
      handoff.dispose();
      data.subscription.unsubscribe();
    };
  }, []);
  return state;
}
