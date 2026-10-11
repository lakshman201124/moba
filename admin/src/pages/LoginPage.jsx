import { useState } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { signIn, resetPasswordRequest } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import { enterDemo, isDemo } from "../lib/demo";
import Field from "../components/ui/Field";

export function AuthFrame({ children, footer }) {
  return (
    <div className="min-h-dvh bg-canvas flex flex-col items-center justify-center px-4 py-10">
      <img src="/logo-full.webp" alt="MOBA, Korean Resto-Cafe" width="144" height="133" className="h-[120px] w-auto object-contain mb-6" />
      <div className="panel w-full max-w-[400px] p-6 sm:p-7">{children}</div>
      {footer && <div className="mt-5 text-center">{footer}</div>}
    </div>
  );
}

export default function LoginPage() {
  const { session, staff } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login");
  const [resetSent, setResetSent] = useState(false);

  if (isDemo || (session && staff)) {
    return <Navigate to="/dashboard" replace />;
  }

  const nextPath = (() => {
    const n = params.get("next") || "/dashboard";
    return n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
  })();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err.message === "NOT_STAFF" ? "This account doesn't have access to MOBA Admin." : "That email and password don't match. Check them and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPasswordRequest(email, `${window.location.origin}/reset-password`);
    } catch {
      // Always show the same message, so nobody can test which emails have accounts.
    } finally {
      setLoading(false);
      setResetSent(true);
    }
  }

  const demoLink = (
    <p className="text-meta text-ink-3">
      Not staff, just looking?{" "}
      <button onClick={enterDemo} className="font-bold text-cobalt-ink hover:underline underline-offset-2">
        Explore the demo
      </button>
    </p>
  );

  if (mode === "forgot") {
    return (
      <AuthFrame footer={demoLink}>
        {resetSent ? (
          <div className="text-center">
            <span className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-green-soft text-green-ink">
              <MailCheck size={20} />
            </span>
            <h1 className="text-h3 font-bold">Check your email</h1>
            <p className="text-body text-ink-2 mt-1">If {email || "that email"} has an account, a reset link is on its way.</p>
            <button onClick={() => { setMode("login"); setResetSent(false); }} className="btn btn-secondary w-full mt-5">
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset}>
            <h1 className="text-h3 font-bold">Reset your password</h1>
            <p className="text-body text-ink-2 mt-1 mb-5">Enter your staff email and we'll send you a link.</p>
            <Field label="Email">
              {(p) => <input {...p} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" autoComplete="email" autoFocus />}
            </Field>
            <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full mt-5">
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <button type="button" onClick={() => setMode("login")} className="btn btn-ghost w-full mt-2">
              Back to sign in
            </button>
          </form>
        )}
      </AuthFrame>
    );
  }

  return (
    <AuthFrame footer={demoLink}>
      <form onSubmit={handleLogin}>
        <h1 className="text-h3 font-bold">Staff sign in</h1>
        <p className="text-body text-ink-2 mt-1 mb-5">Orders, tables and the menu for MOBA.</p>
        {error && (
          <p role="alert" className="mb-4 rounded-[10px] bg-red-soft px-3 py-2.5 text-meta font-semibold text-red">
            {error}
          </p>
        )}
        <div className="space-y-4">
          <Field label="Email">
            {(p) => <input {...p} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" autoComplete="email" autoFocus />}
          </Field>
          <Field
            label="Password"
            counter={
              <button type="button" onClick={() => setMode("forgot")} className="text-cap font-semibold text-cobalt-ink hover:underline underline-offset-2">
                Forgot password?
              </button>
            }
          >
            {(p) => (
              <div className="relative">
                <input
                  {...p}
                  type={show ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-1 top-1 btn btn-ghost btn-icon btn-sm"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            )}
          </Field>
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full mt-6">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthFrame>
  );
}

