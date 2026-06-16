import { InternetIdentityProvider } from "@caffeineai/core-infrastructure";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerFCMServiceWorker } from "./lib/fcm";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <InternetIdentityProvider>
      <App />
    </InternetIdentityProvider>
  </QueryClientProvider>,
);

// Register FCM service worker after app mounts (fire and forget)
registerFCMServiceWorker()
  .then((reg) => {
    if (reg) {
      console.log("[FCM] SW ready, scope:", reg.scope);
    } else {
      console.warn(
        "[FCM] SW registration returned null — notifications may not work in background.",
      );
    }
  })
  .catch((err) => {
    console.warn("[FCM] SW registration failed:", err);
  });
