module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!react-native|@react-native|@react-navigation|react-navigation|react-native-vector-icons|react-native-gesture-handler|react-native-safe-area-context|react-native-screens)',
  ],
  setupFiles: ['react-native-gesture-handler/jestSetup']
};