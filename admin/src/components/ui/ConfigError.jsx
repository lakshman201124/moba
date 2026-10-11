import { enterDemo } from "../../lib/demo";

export default function ConfigError() {
  return (
    <div className="min-h-dvh bg-canvas flex items-center justify-center p-6">
      <div className="panel w-full max-w-md p-6">
        <img src="/logo-mark.webp" alt="MOBA" width="48" height="48" className="h-12 w-12 object-contain mb-4" />
        <h1 className="text-h2 font-bold">Connect MOBA Admin to Supabase</h1>
        <p className="text-body text-ink-2 mt-2">
          The app can't find its Supabase settings. Add these to <span className="font-bold text-ink">admin/.env</span> and
          restart the dev server, or set them in your host's environment variables:
        </p>
        <pre className="mt-4 rounded-[12px] border border-line bg-sunken p-3 text-cap overflow-x-auto">
{`VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…`}
        </pre>
        <p className="text-meta text-ink-3 mt-3">
          Use the <span className="font-bold text-ink">publishable</span> key only. The secret key must never go in this app.
        </p>
        <div className="mt-5 border-t border-line pt-5">
          <p className="text-body font-semibold">Just want to look around?</p>
          <p className="text-meta text-ink-3 mt-0.5">The demo runs on sample data in this browser.</p>
          <button onClick={enterDemo} className="btn btn-secondary mt-3 w-full">Explore the demo</button>
        </div>
      </div>
    </div>
  );
}
