import { type Plugin, type ResolvedConfig, loadEnv } from "vite";
import { parse } from "@babel/parser";
import { walk } from "estree-walker";
import type { ValidationError } from "./types/error";
import type { PluginOptions } from "./types/options";

const EnvSafe = (userOptions: PluginOptions = {}): Plugin => {
	const options: PluginOptions = {
		throwErrorOnMissing: true,
		runtimeChecks: false,
		optional: [],
		...userOptions,
	};

	const VIRTUAL_MODULE_ID = "virtual:env-safe-validator";
	const RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID;

	const BROWER_MODULE_ID = "/@virtual:env-safe-validator";

	const checkedEnvVars = new Set<string>();

	let loadedEnv: Record<string, any>, optionalEnvVars: Set<string>;
	let config: ResolvedConfig;

	loadedEnv = {};
	optionalEnvVars = new Set(options.optional);

	const globalErrors = new Map<string, ValidationError[]>();

	return {
		name: "vite-plugin-env-safe",
		enforce: "pre",

		configResolved(resolvedConfig) {
			config = resolvedConfig;
			loadedEnv = loadEnv(
				resolvedConfig.mode,
				resolvedConfig.envDir || process.cwd(),
				""
			);
			console.debug("Config resolved");
		},

		resolveId(id) {
			if (id === VIRTUAL_MODULE_ID || id === BROWER_MODULE_ID) {
				return RESOLVED_VIRTUAL_MODULE_ID;
			}
		},

		load(id) {
			if (id === RESOLVED_VIRTUAL_MODULE_ID) {
				const envPrefix = config.envPrefix || "VITE_";

				const varsToCheck = Object.keys(loadedEnv).filter((key) => {
					if (optionalEnvVars.has(key)) return false;

					if (typeof envPrefix === "string")
						return key.startsWith(envPrefix);

					return envPrefix.some((p) => key.startsWith(p));
				});

				if (varsToCheck.length === 0) return "export default {}";

				const checks = varsToCheck
					.map((key) => `${key}: import.meta.env.${key}`)
					.join(",\n");

				return `
					const env = { ${checks} };

					const missing = [];

					for ( const [key, value] of Object.entries(env)) {
						if (value === undefined || value === '') {
							missing.push(key);
						}
					}

					if (missing.length > 0) {
						const msg = '[EnvSafe] 🚨 Runtime Validation Failed! The following variables are missing or empty: ' + missing.join(', ');
						console.error(msg);
					} else {
						console.debug('[EnvSafe] ✅ Runtime environment variables verified.');
					}
				`;
			}
		},

		transformIndexHtml(html) {
			if (options.runtimeChecks) {
				return [
					{
						tag: "script",
						attrs: { type: "module" },
						children: `import "${BROWER_MODULE_ID}";`,
					},
				];
			}
			return html;
		},

		transform(code, id) {
			if (id.includes("node_modules") || !/\.[jt]sx?|vue$/.test(id))
				return null;

			// 2. Smart check: Ensure it's not inside a comment or string.
			// This prevents expensive AST parsing for files like:
			// console.log("Don't use import.meta.env directly")
			// Group 1: Single line comments
			// Group 2: Multi-line comments
			// Group 3: Strings (single/double/backtick)
			// Group 4: The actual target code
			const smartGuard =
				/(\/\/.*$)|(\/\*[\s\S]*?\*\/)|(["'`])(?:\\.|[^\\\n\r])*?\3|(import\.meta\.env)/gm;

			let match: RegExpExecArray | null = null,
				shouldParse = false;

			while ((match = smartGuard.exec(code)) !== null) {
				// If any of the first three groups match, it's a comment or string
				if (match[4]) {
					shouldParse = true;
					// Found import.meta.env outside comments/strings
					break;
				}
			}

			if (!shouldParse) return null;

			let ast,
				fileErrors: ValidationError[] = [];

			try {
				ast = parse(code, {
					sourceType: "module",
					plugins: ["typescript", "jsx", "classProperties"],
				});
			} catch (err) {
				return null;
			}

			walk(ast as any, {
				enter(node: any) {
					if (node.type === "MemberExpression") {
						const object = node.object;
						const property = node.property;

						if (
							object.type === "MemberExpression" &&
							object.object.type === "MetaProperty" &&
							object.object.property.name === "meta" &&
							object.property.name === "env" &&
							property.type === "Identifier"
						) {
							const varName = property.name;

							if (
								[
									"MODE",
									"BASE_URL",
									"PROD",
									"DEV",
									"SSR",
								].includes(varName)
							)
								return;

							if (checkedEnvVars.has(varName)) return;

							if (optionalEnvVars.has(varName)) return;

							if (varName in loadedEnv) {
								checkedEnvVars.add(varName);
							} else {
								const line = node.loc
									? node.loc.start.line
									: "?";
								const column = node.loc
									? node.loc.start.column
									: "?";
								fileErrors.push({
									varName: varName,
									line,
									column,
								});
							}
						}
					}
				},
			});

			if (fileErrors.length > 0) {
				// Allows to throw errors during dev server as well
				if (config.command === "serve" && options.throwErrorOnMissing) {
					const errorMessage: string[] = fileErrors.map(
						(e) => `\t❌ ${e.varName} (Line ${e.line}:${e.column})`
					);
					const finalMessage = [
						"\n[EnvSafe] Detected missing environment variables:",
						`In file: ${id}`,
						...errorMessage,
						"\nPlease ensure all environment variables are defined.\n",
					].join("\n");
					this.error(finalMessage);
				}

				globalErrors.set(id, fileErrors);
			}

			return null;
		},

		buildEnd() {
			// Allows to throw errors during build as well.
			if (globalErrors.size > 0) {
				const errorMessage: string[] = [
					"\n[EnvSafe] Detected missing environment variables:",
				];

				globalErrors.forEach((errors, file) => {
					errorMessage.push(`\nIn file: ${file}`);
					errors.forEach((err) => {
						errorMessage.push(
							`\t❌ ${err.varName} (Line ${err.line}:${err.column})`
						);
					});
				});

				errorMessage.push(
					"\nPlease ensure all environment variables are defined.\n"
				);

				const finalMessage = errorMessage.join("\n");

				if (options.throwErrorOnMissing) {
					this.error(finalMessage);
				} else {
					this.warn(finalMessage);
				}
			}
		},
	};
};

export default EnvSafe;
