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
      displayName: 'rules',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/rules/**/*.test.ts'],
      moduleFileExtensions: ['ts', 'js', 'json'],
      testTimeout: 20000,
    },
    {
      displayName: 'app',
      preset: '@react-native/jest-preset',
      testMatch: [
        '<rootDir>/__tests__/**/*.test.tsx',
        '<rootDir>/src/features/**/*.test.tsx',
      ],
      moduleNameMapper,
    },
  ],
};
