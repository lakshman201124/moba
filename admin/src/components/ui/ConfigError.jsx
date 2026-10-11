export default function ConfigError() {
  return (
    <div className="min-h-dvh bg-cream flex items-center justify-center p-6">
      <div className="card w-full max-w-md">
        <h1 className="font-display text-2xl mb-2">Setup needed</h1>
        <p className="text-sm mb-3">
          MOBA Admin can't find its Supabase settings. Add these to{" "}
          <span className="font-bold">admin/.env</span> and restart the dev server (or set them in
          your host's environment variables):
        </p>
        <pre className="rounded-lg border-2 border-line bg-paper p-3 text-xs overflow-x-auto mb-3">
{`VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…`}
        </pre>
        <p className="text-xs text-ink/60">
          Use the <span className="font-bold">publishable</span> key only. The secret key must never
          go in this app.
        </p>
      </div>
    </div>
  );
}
