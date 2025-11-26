module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|react-navigation|react-native-reanimated|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-vector-icons|@react-native-async-storage|react-native-worklets)/)',
  ],
  setupFiles: ['react-native-gesture-handler/jestSetup'],
  
  moduleNameMapper: {
    '^@react-navigation/native$': '@react-navigation/native/lib/commonjs/index.js',
    '^@react-navigation/stack$': '@react-navigation/stack/lib/commonjs/index.js',
    '^@react-navigation/(.*)$': '@react-navigation/$1/lib/commonjs/index.js',
    
    'react-native-linear-gradient': 'react-native-linear-gradient/jest/react-native-linear-gradient.js'
  }
};