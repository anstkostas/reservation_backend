import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["src/generated/**"] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // Enforce explicit return types on exported functions (project convention)
      "@typescript-eslint/explicit-module-boundary-types": "error",
      // No any — use unknown and narrow instead
      "@typescript-eslint/no-explicit-any": "error",
      // Unused vars are always bugs — prefix with _ to allow intentional ones
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Prefer const
      "prefer-const": "error",
      // No var
      "no-var": "error",
    },
  }
);
