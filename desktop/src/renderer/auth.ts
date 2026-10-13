import { createClient } from "@supabase/supabase-js";
import { VISUAL_PREVIEW } from "./appMode";

/** Same origin and unprefixed AsyncStorage keys as W9. This is the only refresh owner. */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: VISUAL_PREVIEW ? undefined : localStorage,
      autoRefreshToken: !VISUAL_PREVIEW,
      persistSession: !VISUAL_PREVIEW,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  },
);

// Browser visual checks cannot read account rows, write data, mint tokens or sign in.
if (VISUAL_PREVIEW) {
  const unavailable = () => {
    throw new Error("Visual preview only. Account operations unavailable.");
  };
  supabase.from = unavailable;
  supabase.rpc = unavailable;
  supabase.functions.invoke = unavailable;
  supabase.auth.signInWithOAuth = unavailable;
  supabase.auth.signInWithPassword = unavailable;
  supabase.auth.exchangeCodeForSession = unavailable;
  supabase.auth.verifyOtp = unavailable;
  supabase.auth.signUp = unavailable;
  supabase.auth.signOut = unavailable;
  supabase.auth.updateUser = unavailable;
  supabase.auth.resetPasswordForEmail = unavailable;
  supabase.auth.setSession = unavailable;
}
