import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/GlobalTypography.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Không tìm thấy thẻ root trong public/index.html");
}

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);