import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { updatePassword } from "../services/authService";
import toast from "react-hot-toast";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 10) {
      toast.error("Password must be at least 10 characters.");
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      toast.success("Password updated. Signing you in…");
      navigate("/dashboard", { replace: true });
    } catch {
      toast.error("Couldn't update the password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="card w-full max-w-sm">
        <h1 className="font-display text-3xl text-center mb-1">MOBA</h1>
        <p className="text-center text-ink/50 text-sm mb-6">
          Set a new password
        </p>

        {!ready ? (
          <p className="text-center text-ink/60 text-sm py-4">
            Verifying your reset link…
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="block mb-4">
              <span className="text-sm font-semibold">New password</span>
              <input
                type="password"
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border-2 border-line bg-cream px-3 py-2.5 text-sm focus:border-cobalt focus:outline-none"
                autoComplete="new-password"
                placeholder="At least 10 characters"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
