module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|react-navigation|react-native-vector-icons|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-reanimated)/)',
  ],
  setupFiles: ['react-native-gesture-handler/jestSetup']
};