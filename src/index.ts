import { type Plugin, loadEnv } from "vite";
import { parse } from "@babel/parser";
import { walk } from "estree-walker";

const EnvSafe = (): Plugin => {
	const checkedEnvVars = new Set<string>();

	let definedEnvVars: Record<string, any> = {};

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

			let ast;

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
								const msg = `❌ [EnvSafe] Missing Env Var: "${varName}" in ${id}`;
								throw new Error(msg);
							}
						}
					}
				},
			});

			return null;
		},

		buildStart() {},
	};
};

export default EnvSafe;
