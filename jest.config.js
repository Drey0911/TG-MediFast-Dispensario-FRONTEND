module.exports = {
  preset: 'react-native',
  
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native(-community)?|@react-navigation|react-native-reanimated|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-vector-icons|@react-native-async-storage|react-native-worklets|react-native-linear-gradient)/)',
  ],
  
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  testEnvironment: 'node',
};