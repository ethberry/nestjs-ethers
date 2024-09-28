import typescriptRules from "@ethberry/eslint-config/presets/tsx.mjs";
import jestRules from "@ethberry/eslint-config/tests/jest.mjs";

export default [
  {
    ignores: ["**/dist", "**/coverage"],
  },

  {
    languageOptions: {
      parserOptions: {
        project: [
          "./tsconfig.eslint.json",
          "./auth/*/tsconfig.eslint.json",
          "./ipfs/*/tsconfig.eslint.json",
          "./modules/*/tsconfig.eslint.json",
          "./utils/*/tsconfig.eslint.json",
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  ...typescriptRules,
  ...jestRules,
];
