import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, isConfigured } from "./env";

// Without config we still build a client (pointed nowhere) so imports don't throw;
// main.jsx shows a setup screen instead of the app.
export const supabase = createClient(
  isConfigured ? SUPABASE_URL : "https://not-configured.invalid",
  isConfigured ? SUPABASE_PUBLISHABLE_KEY : "not-configured",
);
