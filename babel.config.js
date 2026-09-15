module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
          '@domain': './src/domain',
          '@data': './src/data',
          '@features': './src/features',
          '@ui': './src/ui',
          '@navigation': './src/navigation',
          '@lib': './src/lib',
        },
      },
    ],
  ],
};
