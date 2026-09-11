import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// L'API est servie sous /api par le serveur de développement : le navigateur
// ne parle donc qu'à un seul port. Plus de CORS, et rien qu'un bloqueur de
// publicité ou une extension puisse prendre pour une requête tierce.
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: process.env.API_URL || "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
});
