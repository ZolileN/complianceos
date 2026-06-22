import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "LogicalExpression[operator='||'][left.type='MemberExpression'][left.object.object.name='process'][left.object.property.name='env'][right.type='Literal'][right.value!='']",
          message: "Do not use hardcoded string fallbacks for environment variables. Use an empty string '' or rely on the environment variable directly."
        }
      ]
    }
  }
]);

export default eslintConfig;
