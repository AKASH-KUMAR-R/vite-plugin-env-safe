import { type Plugin, loadEnv } from "vite";
import { parse } from "@babel/parser";
import { walk } from "estree-walker";
import { type ValidationError } from "./types/error";

const EnvSafe = (): Plugin => {
	const checkedEnvVars = new Set<string>();

	let definedEnvVars: Record<string, any> = {};

	const globalErrors = new Map<string, ValidationError[]>();

	return {
		name: "vite-plugin-safe-env",
		enforce: "pre",

		configResolved(config) {
			definedEnvVars = loadEnv(
				config.mode,
				config.envDir || process.cwd(),
				""
			);
			console.debug("Config resolved");
		},

		transform(code, id) {
			if (id.includes("node_modules") || !/\.[jt]sx?|vue$/.test(id)) {
				return;
			}

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

							if (varName in definedEnvVars) {
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
				globalErrors.set(id, fileErrors);
			}

			return null;
		},

		buildEnd() {
			if (globalErrors.size > 0) {
				const errorMessage: string[] = [
					"\n[EnvSafe] Detected missing environment variables:",
				];

				globalErrors.forEach((errors, file) => {
					errorMessage.push(`\nIn file: ${file}`);
					errors.forEach((err) => {
						errorMessage.push(
							`	❌ ${err.varName} (Line ${err.line}:${err.column})`
						);
					});
				});

				errorMessage.push(
					"\nPlease ensure all environment variables are defined.\n"
				);

				const finalMessage = errorMessage.join("\n");
				this.error(finalMessage);
			}
		},
	};
};

export default EnvSafe;
