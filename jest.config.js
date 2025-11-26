module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|react-navigation|react-native-reanimated|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-vector-icons|@react-native-async-storage|react-native-worklets)/)',
  ],
  setupFiles: ['react-native-gesture-handler/jestSetup']
};