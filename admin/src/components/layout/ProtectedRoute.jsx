import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { signOut } from "../../services/authService";

export function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas" aria-busy="true" aria-label="Loading MOBA Admin">
      <img src="/logo-mark.webp" alt="" width="64" height="64" className="h-16 w-16 object-contain animate-pulse" />
    </div>
  );
}

export default function ProtectedRoute({ children }) {
  const { loading, session, staff } = useAuth();
  const location = useLocation();
  const [kicked, setKicked] = useState(false);

  useEffect(() => {
    if (!loading && session && !staff) {
      signOut().finally(() => setKicked(true));
    }
  }, [loading, session, staff]);

  if (loading) return <Splash />;

  if (kicked) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas p-6">
        <div className="panel w-full max-w-sm p-6 text-center">
          <span className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-red-soft text-red">
            <ShieldAlert size={20} />
          </span>
          <p className="text-h3 font-bold">No access to MOBA Admin</p>
          <p className="mt-1 text-body text-ink-2">This account isn't on the staff list. Ask the owner to add you, or sign in with another account.</p>
          <a href="/login" className="btn btn-primary mt-5 w-full">Sign in with another account</a>
        </div>
      </div>
    );
  }

  if (!session) {
    const next = location.pathname + location.search;
    const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/";
    return <Navigate to={`/login?next=${encodeURIComponent(safe)}`} replace />;
  }

  if (!staff) return null;

  return children;
}
