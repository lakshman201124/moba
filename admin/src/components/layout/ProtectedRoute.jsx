import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { signOut } from "../../services/authService";
import { useEffect, useState } from "react";

export default function ProtectedRoute({ children }) {
  const { loading, session, staff } = useAuth();
  const location = useLocation();
  const [kicked, setKicked] = useState(false);

  useEffect(() => {
    if (!loading && session && !staff) {
      signOut().finally(() => setKicked(true));
    }
  }, [loading, session, staff]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream">
        <div className="animate-pulse text-ink/40 font-display text-2xl">
          MOBA
        </div>
      </div>
    );
  }

  if (kicked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream p-6">
        <div className="card max-w-sm text-center">
          <p className="font-bold text-lg mb-2">Access denied</p>
          <p className="text-ink/60 mb-4">
            This account doesn't have access to MOBA Admin.
          </p>
          <a href="/login" className="btn-primary">
            Sign in with another account
          </a>
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
