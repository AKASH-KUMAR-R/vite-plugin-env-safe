import { type Plugin } from "vite";

const EnvSafe = (): Plugin => {
	const usedEnvVars = new Set<string>();
	let definedEnvVars: Record<string, any> = {};

	return {
		name: "vite-plugin-safe-env",
		enforce: "pre",

		configResolved(config) {
			definedEnvVars = config.env;
			console.debug("Config resolved");
		},

		transform(code, id) {
			if (id.includes("node_modules")) {
				return;
			}

			const regex = /import\.meta\.env\.([a-zA-Z0-9_]+)/g;

			let match;

			console.debug(`Scanning file for env vars: ${id}`);
			while ((match = regex.exec(code)) !== null && match[1]) {
				console.debug(
					`Found usage of env var: ${match[1]} in file: ${id}`
				);
				usedEnvVars.add(match[1]);
			}

			const missing = [...usedEnvVars].filter(
				(v) => !(v in definedEnvVars)
			);

			console.debug("Used env vars:", [...usedEnvVars]);

			if (missing.length > 0) {
				console.error("[ERROR]: Some env variables are missing");

				for (const name of missing) {
					console.error(`	-${name}`);
				}

				throw new Error("Environment variable validation failed");
			}
		},

		buildStart() {},
	};
};

export default EnvSafe;
