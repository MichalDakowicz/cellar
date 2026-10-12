import { useEffect, useState } from "react";
import { supabase } from "./auth";

export function useProfile(ownerId: string, fallback: string) {
  const [profile, setProfile] = useState<{
    name: string;
    avatar: string | null;
  }>({ name: fallback, avatar: null });
  useEffect(() => {
    let active = true;
    void supabase
      .from("profiles")
      .select("id, username, display_name, pfp")
      .eq("id", ownerId)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data)
          setProfile({
            name: data.display_name || data.username || fallback,
            avatar: data.pfp ?? null,
          });
      });
    return () => {
      active = false;
    };
  }, [ownerId, fallback]);
  return profile;
}
