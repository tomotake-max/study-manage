import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { vaultApiPlugin } from "./vite-plugins/vault-api";
export default defineConfig({ plugins: [react(), vaultApiPlugin()] });
