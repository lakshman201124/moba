import { useState } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { signIn, resetPasswordRequest } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { session, staff } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");
  const [resetSent, setResetSent] = useState(false);

  if (session && staff) {
    return <Navigate to="/dashboard" replace />;
  }

  const nextPath = (() => {
    const n = params.get("next") || "/dashboard";
    return n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
  })();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      navigate(nextPath, { replace: true });
    } catch (err) {
      if (err.message === "NOT_STAFF") {
        toast.error("This account doesn't have access to MOBA Admin.");
      } else {
        toast.error("Email or password is wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      await resetPasswordRequest(email, redirectTo);
      setResetSent(true);
    } catch {
      // always show success to avoid account enumeration
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="card w-full max-w-sm">
        <h1 className="font-display text-3xl text-center mb-1">MOBA</h1>
        <p className="text-center text-ink/50 text-sm mb-6">Admin</p>

        {mode === "login" ? (
          <form onSubmit={handleLogin}>
            <label className="block mb-3">
              <span className="text-sm font-semibold">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border-2 border-line bg-cream px-3 py-2.5 text-sm focus:border-cobalt focus:outline-none"
                autoComplete="email"
              />
            </label>
            <label className="block mb-4">
              <span className="text-sm font-semibold">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border-2 border-line bg-cream px-3 py-2.5 text-sm focus:border-cobalt focus:outline-none"
                autoComplete="current-password"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="btn-ghost w-full mt-2 text-sm"
            >
              Forgot password?
            </button>
          </form>
        ) : resetSent ? (
          <div className="text-center py-4">
            <p className="font-semibold mb-2">Check your email</p>
            <p className="text-ink/60 text-sm">
              If that email has an account, we've sent a link.
            </p>
            <button
              onClick={() => {
                setMode("login");
                setResetSent(false);
              }}
              className="btn-ghost mt-4 text-sm"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset}>
            <p className="text-ink/60 text-sm mb-4">
              Enter your email and we'll send a reset link.
            </p>
            <label className="block mb-4">
              <span className="text-sm font-semibold">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border-2 border-line bg-cream px-3 py-2.5 text-sm focus:border-cobalt focus:outline-none"
                autoComplete="email"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <button
              type="button"
              onClick={() => setMode("login")}
              className="btn-ghost w-full mt-2 text-sm"
            >
              Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
