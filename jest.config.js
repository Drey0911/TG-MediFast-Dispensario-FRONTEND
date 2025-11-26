module.exports = {
  preset: 'react-native',
  
  // Asegura que Jest transforme estos módulos
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native(-community)?|@react-navigation|react-native-reanimated|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-vector-icons|@react-native-async-storage|react-native-worklets|react-native-linear-gradient)/)',
  ],
  
  setupFiles: ['react-native-gesture-handler/jestSetup'],
  
  // Fuerza a Jest a usar las versiones CommonJS
  moduleNameMapper: {
    '^@react-navigation/native$': '@react-navigation/native/lib/commonjs/index',
    '^@react-navigation/stack$': '@react-navigation/stack/lib/commonjs/index',
    '^@react-navigation/elements$': '@react-navigation/elements/lib/commonjs/index',
    '^@react-navigation/core$': '@react-navigation/core/lib/commonjs/index',
    'react-native-linear-gradient': 'react-native-linear-gradient/jest/react-native-linear-gradient.js'
  },
  
  // Configuración adicional para resolver módulos correctamente
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Asegura que Jest use la configuración correcta de resolución
  resolver: undefined,
  
  testEnvironment: 'node',
};