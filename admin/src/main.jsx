import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { queryClient } from "./lib/queryClient";
import { isConfigured } from "./lib/env";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import ConfigError from "./components/ui/ConfigError";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {isConfigured ? (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
          <Toaster position="top-center" toastOptions={{ style: { fontFamily: "Nunito, sans-serif", fontWeight: 600 } }} />
        </AuthProvider>
      </QueryClientProvider>
    ) : (
      <ConfigError />
    )}
  </StrictMode>,
);
