import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import { queryClient } from "./lib/queryClient";
import { isConfigured } from "./lib/env";
import { isDemo } from "./lib/demo";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import ConfigError from "./components/ui/ConfigError";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {isConfigured || isDemo ? (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    ) : (
      <ConfigError />
    )}
  </StrictMode>,
);
