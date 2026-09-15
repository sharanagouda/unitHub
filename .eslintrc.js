module.exports = {
  root: true,
  extends: '@react-native',
  // functions/ is a separate npm package (its own deps, its own tsconfig —
  // see tsconfig.json's `exclude`) with its own eslint config and `npm run
  // lint`. Linting it from here would resolve imports against the wrong
  // node_modules.
  ignorePatterns: ['functions/'],
  overrides: [
    {
      /**
       * The domain layer is the money logic. It must stay pure TypeScript so
       * it can be unit-tested without an emulator, a device, or a mock — and
       * so that a Firestore schema change can never quietly alter a rent
       * calculation. This rule is what keeps that true over time.
       */
      files: ['src/domain/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  '@react-native-firebase/*',
                  'firebase*',
                  '@data/*',
                  '../data/*',
                  'react',
                  'react-native',
                ],
                message:
                  'src/domain must stay pure. No Firebase, no data layer, no React. ' +
                  'Pass plain values in and return plain values out.',
              },
            ],
          },
        ],
      },
    },
  ],
};
