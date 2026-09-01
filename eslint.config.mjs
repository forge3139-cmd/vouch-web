import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // lib/actions.ts and lib/confirmation.ts talk to a Supabase client with
    // no generated Database schema (no live project to generate one from
    // yet — see the note in lib/supabase.ts). The `as any` casts there are
    // a deliberate, scoped escape from that gap, not general sloppiness.
    files: ["lib/actions.ts", "lib/confirmation.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
