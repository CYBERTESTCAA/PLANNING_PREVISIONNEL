// Polyfill crypto.randomUUID for non-secure contexts (HTTP on LAN)
if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
  crypto.randomUUID = () =>
    '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c: string) =>
      (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16)
    ) as `${string}-${string}-${string}-${string}-${string}`;
}

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { PlanningStoreProvider } from "@/contexts/PlanningStoreContext";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <PlanningStoreProvider>
      <App />
    </PlanningStoreProvider>
  </AuthProvider>
);
