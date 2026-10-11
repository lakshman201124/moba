import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { isDemo } from "../lib/demo";
import { getStaffRow } from "../services/authService";

const AuthContext = createContext(null);

const DEMO_STATE = {
  loading: false,
  session: { user: { id: "demo-staff", email: "owner@moba.cafe" } },
  staff: { user_id: "demo-staff", display_name: "Ji-woo Kim", role: "owner", is_active: true },
};

export function AuthProvider({ children }) {
  return isDemo ? (
    <AuthContext.Provider value={DEMO_STATE}>{children}</AuthContext.Provider>
  ) : (
    <SupabaseAuth>{children}</SupabaseAuth>
  );
}

function SupabaseAuth({ children }) {
  const [state, setState] = useState({
    loading: true,
    session: null,
    staff: null,
  });

  useEffect(() => {
    let active = true;
    let latest = 0; // ignore a slow staff lookup that a newer auth event has overtaken

    async function apply(session) {
      const run = ++latest;
      let staff = null;
      if (session) {
        try {
          staff = await getStaffRow(session.user.id);
        } catch {
          staff = null;
        }
      }
      if (active && run === latest) setState({ loading: false, session, staff });
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => apply(session))
      .catch(() => apply(null));

    // supabase-js runs this callback while holding its internal auth lock. Awaiting another
    // Supabase call in here (getStaffRow) deadlocks on reload when a session is stored, which
    // leaves the app on the splash screen forever. So never await in the callback; defer instead.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return; // getSession() above handles the first load
      if (event === "SIGNED_OUT") {
        latest++;
        setState({ loading: false, session: null, staff: null });
      } else if (session) {
        setTimeout(() => apply(session), 0);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
