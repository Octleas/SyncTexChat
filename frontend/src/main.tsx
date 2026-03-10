import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { UIProvider } from "@workspaces/ui";

import App from "./App.js";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UIProvider>
      <App />
    </UIProvider>
  </StrictMode>
);
