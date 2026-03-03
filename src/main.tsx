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
