import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Handle unhandled promise rejections gracefully
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  console.error('Stack trace:', event.reason?.stack);
  event.preventDefault(); // Prevent the default unhandled rejection behavior
});

window.addEventListener('error', (event) => {
  console.error('JavaScript error:', event.error);
  console.error('Error message:', event.message);
  console.error('Error filename:', event.filename);
  console.error('Error lineno:', event.lineno);
});



createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Signal to prerender plugin that React app has finished initial rendering
document.dispatchEvent(new Event('render-event'));
