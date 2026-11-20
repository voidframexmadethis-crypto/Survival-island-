import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next";

export default defineConfig([
    ...next,
    globalIgnores([
        ".next/**",
        ".next-dev/**",
        ".data/**",
        "out/**",
        "build/**",
        "next-env.d.ts",
    ]),
]);
