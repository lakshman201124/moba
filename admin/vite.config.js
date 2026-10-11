import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Vite exposes only variables with these prefixes. The Supabase dashboard's
// "Connect" snippet uses NEXT_PUBLIC_*, so both spellings are accepted (see src/lib/env.js).
const ENV_PREFIX = ["VITE_", "NEXT_PUBLIC_"];

// The secret / service-role key must never reach the browser bundle.
function looksLikeSecretKey(value = "") {
  if (value.startsWith("sb_secret_")) return true;
  const payload = value.split(".")[1];
  if (!payload) return false;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()).role === "service_role";
  } catch {
    return false;
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ENV_PREFIX);
  for (const [name, value] of Object.entries(env)) {
    if (looksLikeSecretKey(value)) {
      throw new Error(
        `${name} holds a Supabase secret (service-role) key. Use the publishable key here; the secret key must never reach the browser.`,
      );
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    envPrefix: ENV_PREFIX,
    server: { port: 5174 },
    build: {
      rollupOptions: {
        output: {
          // Libraries change less often than the app, so they cache separately.
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            supabase: ["@supabase/supabase-js"],
            data: ["@tanstack/react-query", "react-hook-form", "zod"],
          },
        },
      },
    },
  };
});
