import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep successful data fresh for 2 minutes to prevent loading flicker
      staleTime: 1000 * 60 * 2,
      gcTime: 10 * 60_000,
      retry: (failureCount, error) => {
        if (error?.response?.status === 404) return false;
        return failureCount < 1;
      },
      retryDelay: (attempt) => Math.min(1000 * (2 ** attempt), 3000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
