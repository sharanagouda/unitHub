const moduleNameMapper = {
  '^@domain/(.*)$': '<rootDir>/src/domain/$1',
  '^@data/(.*)$': '<rootDir>/src/data/$1',
  '^@features/(.*)$': '<rootDir>/src/features/$1',
  '^@ui/(.*)$': '<rootDir>/src/ui/$1',
  '^@navigation/(.*)$': '<rootDir>/src/navigation/$1',
  '^@lib/(.*)$': '<rootDir>/src/lib/$1',
};

module.exports = {
  projects: [
    {
      /* The domain layer is pure TypeScript with no native dependencies, so it
         needs no React Native preset and runs on plain node — fast enough to
         keep in watch mode while working on the ledger. */
      displayName: 'domain',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/domain/**/*.test.ts'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
      moduleNameMapper,
    },
    {
      /* Schemas and converters are plain functions over zod + the domain
         layer — no Firestore runtime import, so this runs on plain node like
         the domain project. Firestore-touching code (refs.ts, hooks/) has no
         unit tests here; it's thin enough to verify by running the app. */
      displayName: 'data',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/data/**/*.test.ts'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
      moduleNameMapper,
    },
    {
      /* Same reasoning as domain/data: only src/lib's pure-logic files (no
         RN/Firebase runtime import) get a .test.ts here, so this also runs
         on plain node. Anything that needs rendering or a native module
         belongs in the `app` project below as a .test.tsx instead. */
      displayName: 'lib',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/lib/**/*.test.ts'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
      moduleNameMapper,
    },
    {
      /* Only resolveTheme and the token modules get a .test.ts here — pure,
         no RN import. Component-level UI tests are .test.tsx under the
         `app` project below. */
      displayName: 'ui',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/ui/**/*.test.ts'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
      moduleNameMapper,
    },
    {
      displayName: 'rules',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/rules/**/*.test.ts'],
      moduleFileExtensions: ['ts', 'js', 'json'],
      testTimeout: 20000,
    },
    {
      displayName: 'app',
      preset: '@react-native/jest-preset',
      // Each component test installs its own onSnapshot fake (fakeFirestore.ts)
      // and its own Share spy — clear mock call history between tests so one
      // test's `toHaveBeenCalledWith` assertions can't see a previous test's calls.
      clearMocks: true,
      testMatch: [
        '<rootDir>/__tests__/**/*.test.tsx',
        '<rootDir>/src/features/**/*.test.tsx',
        '<rootDir>/src/ui/**/*.test.tsx',
      ],
      moduleNameMapper,
      // The RN preset's default pattern only transforms react-native and
      // @react-native(-community) packages; @react-native-firebase,
      // @react-navigation and react-native-mmkv ship ESM dist builds too and
      // need the same treatment or Jest chokes on their `import` statements.
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native(-mmkv)?|@react-native(-community|-firebase)?|@react-navigation)/)',
      ],
    },
  ],
};
