import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initDevAuth } from "./utils/initDevAuth";

initDevAuth().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
