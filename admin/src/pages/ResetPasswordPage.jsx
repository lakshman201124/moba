import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { updatePassword } from "../services/authService";
import { AuthFrame } from "./LoginPage";
import Field from "../components/ui/Field";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 10) {
      setError("Use at least 10 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await updatePassword(password);
      toast.success("Password updated. Signing you in…");
      navigate("/dashboard", { replace: true });
    } catch {
      setError("Couldn't update the password. The link may have expired: request a new one from the sign-in page.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame>
      <h1 className="text-h3 font-bold">Set a new password</h1>
      {!ready ? (
        <p className="text-body text-ink-2 mt-2" aria-live="polite">Checking your reset link…</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5">
          <Field label="New password" hint="At least 10 characters." error={error}>
            {(p) => (
              <input
                {...p}
                type="password"
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                autoComplete="new-password"
                autoFocus
              />
            )}
          </Field>
          <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full mt-6">
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </AuthFrame>
  );
}
