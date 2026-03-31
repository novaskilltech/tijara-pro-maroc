import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const container = document.getElementById("root");

if (container) {
  try {
    const root = createRoot(container);
    root.render(<App />);
    console.log("🚀 Tijara Pro est lancé.");
  } catch (error) {
    console.error("FATAL RENDERING ERROR:", error);
    document.body.insertAdjacentHTML('afterbegin', `
      <div style="background: #fee; color: #b00; padding: 20px; border: 1px solid #f88; margin: 20px; border-radius: 8px; font-family: sans-serif;">
        <h2 style="margin-top: 0;">⚠️ Erreur au démarrage</h2>
        <p>L'application n'a pas pu démarrer. Vérifiez les variables d'environnement Vercel.</p>
        <pre style="background: rgba(0,0,0,0.05); padding: 10px; border-radius: 4px; overflow: auto;">${error}</pre>
      </div>
    `);
  }
}
