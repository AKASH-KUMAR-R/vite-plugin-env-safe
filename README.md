# vite-plugin-env-safe

### Zero-Config Environment Variable Validation for Vite

[![NPM Version](https://img.shields.io/npm/v/vite-plugin-env-safe.svg)](https://www.npmjs.com/package/vite-plugin-env-safe)
[![NPM Downloads](https://img.shields.io/npm/dm/vite-plugin-env-safe.svg)](https://www.npmjs.com/package/vite-plugin-env-safe)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Vite](https://img.shields.io/badge/vite-4%2B-blue)
![Node](https://img.shields.io/badge/node-14.18%2B-blue)

> Automatically validates your environment variables by scanning real usage in code — no schemas, no config, no manual lists.

Most environment validators require schemas (Zod/Joi) or maintaining a list of required variables.  
`vite-plugin-env-safe` is different — it **automatically scans your source code**, finds every usage of `import.meta.env.*`, and ensures the variables exist in your `.env` files.

If a variable is missing, the build fails. **Simple and safe.**

---

## Why this plugin?

| Without this plugin                                                | With `vite-plugin-env-safe`                         |
| ------------------------------------------------------------------ | --------------------------------------------------- |
| You forget `VITE_API_KEY` in `.env`, app deploys, crashes silently | Build stops immediately with missing variable error |
| Must maintain manual lists or schemas                              | **Zero configuration**                              |
| Missed validations until runtime                                   | Validation on **build** and **browser runtime**     |

---

## Features

-   **AST-based automatic environment variable detection**
-   **Fail fast:** missing variable = build error
-   **Dev Overlay**: errors visible directly in browser during development
-   **Optional runtime validation** for empty/undefined values
-   **Optimized parsing:** only scans files where `import.meta.env` is referenced
-   **Zero config by default**, extensible when needed

---

## Installation

```bash
npm install -D vite-plugin-env-safe
# or
yarn add -D vite-plugin-env-safe
# or
pnpm add -D vite-plugin-env-safe
```

## Usage

Add the plugin to your `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import EnvSafe from "vite-plugin-env-safe";

export default defineConfig({
	plugins: [
		EnvSafe({
			throwErrorOnMissing: true,
			runtimeChecks: false,
			optional: [],
		}),
	],
});
```

## Configuration Options

| Option              | Type     | Default       | Description                                                                                |
| ------------------- | -------- | ------------- | ------------------------------------------------------------------------------------------ |
| throwErrorOnMissing | boolean  | true          | If true, build fails when env var is missing. If false, logs a warning instead of failing. |
| runtimeChecks       | boolean  | false         | If true, enables browser-side validation for missing or empty variables.                   |
| optional            | string[] | []            | Variables listed here will not trigger errors even if they are missing.                    |
| envDir              | string   | process.cwd() | Directory to search for `.env` files (same behavior as Vite’s `envDir`).                   |

## How It Works

### Build-Time Validation (Static Check)

The plugin uses @babel/parser to detect usage of:

```ts
import.meta.env.*
```

Example:

```ts
console.log(import.meta.env.VITE_API_URL);
```

If VITE_API_URL is not defined in .env, the build fails:

```ts
❌ [EnvSafe] Missing Env Var: "VITE_API_URL" in src/App.tsx:10:5
```

## 2️ Runtime Validation (Optional)

### Enable it with:

```ts
EnvSafe({ runtimeChecks: true });
```

This adds a lightweight script to index.html that validates VITE\_\* variables in the browser.
If any evaluate to "" or undefined, the DevTools console logs:

```ts
🚨 Runtime Validation Failed — Environment variable "VITE_API_URL" is empty or undefined.
```

## Troubleshooting

| Issue                                    | Possible Cause / Solution                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| Plugin isn’t detecting variables         | Only variables starting with `VITE_` are exposed to client-side code by Vite. |
| `.env.example` exists but `.env` doesn’t | The plugin reads `.env` — example files are NOT loaded automatically.         |
| No browser warnings                      | `runtimeChecks: true` must be enabled.                                        |
| Missing vars but no build error          | Check whether variables were added to `optional`.                             |

## Contributing

### Contributions welcome!

```bash
git clone https://github.com/your-username/vite-plugin-env-safe.git
cd vite-plugin-env-safe
pnpm install
```

Before submitting PRs:

-   Keep build/runtime overhead small
-   Maintain zero-config simplicity
-   Avoid heavy external libraries unless justified

## License

MIT Licensed

## Support

If this plugin saved you from deployment issues caused by missing environment variables:
please give the project a star on GitHub — it helps developers discover it.

Built for developers who forget .env variables —
so your Vite apps never crash silently again
