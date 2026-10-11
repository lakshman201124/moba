import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getStaffRow } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    loading: true,
    session: null,
    staff: null,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        getStaffRow(session.user.id).then((staff) => {
          setState({ loading: false, session, staff });
        });
      } else {
        setState({ loading: false, session: null, staff: null });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setState({ loading: false, session: null, staff: null });
      } else if (session) {
        const staff = await getStaffRow(session.user.id);
        setState({ loading: false, session, staff });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
