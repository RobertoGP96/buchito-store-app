import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [
      // Worktrees de otras sesiones de Claude: traen su propio .next y node_modules.
      ".claude/**",
      ".next/**",
      "generated/**",
      "next-env.d.ts",
      "public/**",
      "scripts/**",
    ],
  },
];

export default eslintConfig;
