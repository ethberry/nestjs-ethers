import typescriptRules from "@gemunion/eslint-config/presets/ts.mjs";
import mochaRules from "@gemunion/eslint-config/tests/mocha.mjs";

// DON'T ADD ANY RULES!
// FIX YOUR SHIT!!!

export default [
  {
    ignores: [
      "**/dist",
    ]
  },

  {
    languageOptions: {
      parserOptions: {
        project: [
          "./tsconfig.eslint.json",
        ],
        tsconfigRootDir: import.meta.dirname
      },
    }
  },

  ...typescriptRules,
  ...mochaRules,
];
