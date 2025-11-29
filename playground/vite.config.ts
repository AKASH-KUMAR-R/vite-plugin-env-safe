import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import EnvSafe from "../src/index";

import path from "path";

// https://vite.dev/config/
export default defineConfig({
	resolve: {
		alias: {
			"vite-plugin-env-safe": path.resolve(__dirname, "../src/index.ts"),
		},
		dedupe: ["vite"],
	},
	plugins: [react(), EnvSafe()],
});
