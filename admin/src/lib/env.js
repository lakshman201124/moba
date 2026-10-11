// Vite only exposes variables whose names start with an envPrefix (see vite.config.js).
// The Supabase dashboard's "Connect" snippet names them NEXT_PUBLIC_*, so accept both.
const env = import.meta.env;

export const SUPABASE_URL = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_PUBLISHABLE_KEY =
  env.VITE_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
export const PUBLIC_MENU_URL = (env.VITE_PUBLIC_MENU_URL || "https://moba.cafe").replace(/\/+$/, "");

export const isConfigured =
  Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) &&
  !/YOUR_/.test(`${SUPABASE_URL}${SUPABASE_PUBLISHABLE_KEY}`);
